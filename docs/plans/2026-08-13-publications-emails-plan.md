# Publications Emails Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Monthly recap email to every Publications user listing their in-progress articles, plus a manually-sent, pre-filled "carousel request" email when an article becomes Accepted.

**Architecture:** Follows the existing conges-recap pattern exactly: pure `render…Email` functions (vitest-tested) + `send…Email` functions calling the Resend HTTP API via `fetch`, a Vercel cron route guarded by `CRON_SECRET`, and `next-safe-action` server actions for the admin-triggered carousel email. One new nullable column `Article.carouselEmailSentAt` tracks sending.

**Tech Stack:** Next.js 15 App Router, Prisma/PostgreSQL, next-safe-action, next-intl, shadcn/ui, Resend HTTP API (no npm package), vitest, Playwright.

**Design doc:** `docs/plans/2026-08-13-publications-emails-design.md`

**Conventions to respect (CLAUDE.md):** no `any`, no useEffect, no comments explaining code, services in `lib/services/`, sonner toasts on mutations, FR+EN i18n for all UI strings, work on `main`, commit after each task, `npm run verify:push` before final push.

---

### Task 1: Schema migration — `carouselEmailSentAt`

**Files:**
- Modify: `prisma/schema.prisma` (model `Article`, after `pdfKey`)

**Step 1: Add the column**

```prisma
  carouselEmailSentAt DateTime?
```

**Step 2: Run the migration (dev DB)**

Run: `npx prisma migrate dev --name add_carousel_email_sent_at`
Expected: migration created and applied, client regenerated.

**Step 3: Apply to the test DB** (memory: testdb must get every new migration or verify:push E2E fails)

Run: `DATABASE_URL=$(grep '^DATABASE_URL' .env.test | cut -d '=' -f2- | tr -d '"') npx prisma migrate deploy`
Expected: `1 migration applied`.

**Step 4: Restart the dev server if it is running** (memory: stale in-memory Prisma client fails writes with new field). Tell Solenn.

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(publications): track carousel email sent date on articles"
```

---

### Task 2: Shared cron auth helper

`isAuthorizedCron` lives in `lib/services/conges/recap.ts:77`. The publications cron must not import from conges.

**Files:**
- Create: `lib/cron-auth.ts`
- Modify: `lib/services/conges/recap.ts` (remove the function, re-export it for existing imports)
- Test: `lib/cron-auth.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { isAuthorizedCron } from './cron-auth'

describe('isAuthorizedCron', () => {
  it('accepts only the exact bearer secret', () => {
    expect(isAuthorizedCron('Bearer s3cret', 's3cret')).toBe(true)
    expect(isAuthorizedCron('Bearer wrong', 's3cret')).toBe(false)
    expect(isAuthorizedCron(null, 's3cret')).toBe(false)
    expect(isAuthorizedCron('Bearer s3cret', undefined)).toBe(false)
  })
})
```

Run: `npx vitest run lib/cron-auth.test.ts` — Expected: FAIL (module not found).

**Step 2: Implement**

Move the function body from `lib/services/conges/recap.ts` into `lib/cron-auth.ts`:

```ts
export function isAuthorizedCron(authorizationHeader: string | null, cronSecret: string | undefined): boolean {
  if (!cronSecret) return false
  return authorizationHeader === `Bearer ${cronSecret}`
}
```

In `lib/services/conges/recap.ts` replace the function with:

```ts
export { isAuthorizedCron } from '@/lib/cron-auth'
```

(Keep the export so `app/api/cron/conges-recap/route.ts` keeps working unchanged.)

**Step 3: Verify**

Run: `npx vitest run lib/cron-auth.test.ts lib/services/conges` — Expected: PASS (existing conges tests still green).

**Step 4: Commit**

```bash
git add lib/cron-auth.ts lib/cron-auth.test.ts lib/services/conges/recap.ts
git commit -m "refactor: extract shared cron bearer auth helper"
```

---

### Task 3: Recap data — pure selection logic + recipients service

**Files:**
- Create: `lib/publications/recap.ts` (pure, client-safe)
- Create: `lib/publications/recap.test.ts`
- Create: `lib/services/publications/recap.ts` (Prisma)

**Step 1: Write the failing test** (`lib/publications/recap.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { selectRecapArticles, type RecapArticle } from './recap'
import type { MyPublicationItem } from '@/lib/services/publications/my-publications'

function item(overrides: Partial<MyPublicationItem>): MyPublicationItem {
  return {
    id: 'a1', title: 'T', type: 'ORIGINAL', status: 'UNDER_REVIEW', scope: 'LARIB_TEAM',
    year: null, studyLabel: null, currentJournal: 'JACC', currentJournalFull: 'JACC Full',
    doi: null, pdfUrl: null, order: 2, totalAuthors: 5, positionBucket: 'middle',
    isFirst: false, authors: [], lastSubmissionAt: null, acceptedAt: null,
    pendingDays: null, submissions: [],
    ...overrides,
  }
}

describe('selectRecapArticles', () => {
  it('keeps only in-preparation, under-review and to-resubmit articles', () => {
    const rows = selectRecapArticles([
      item({ id: '1', status: 'IN_PREPARATION' }),
      item({ id: '2', status: 'UNDER_REVIEW' }),
      item({ id: '3', status: 'TO_RESUBMIT' }),
      item({ id: '4', status: 'ACCEPTED' }),
      item({ id: '5', status: 'PUBLISHED' }),
      item({ id: '6', status: 'ABANDONED' }),
    ])
    expect(rows.map((row: RecapArticle) => row.id)).toEqual(['1', '2', '3'])
  })

  it('exposes title, status, journal and author position', () => {
    const [row] = selectRecapArticles([item({ status: 'UNDER_REVIEW' })])
    expect(row).toEqual({
      id: 'a1', title: 'T', status: 'UNDER_REVIEW',
      journalName: 'JACC', order: 2, totalAuthors: 5,
    })
  })
})
```

Check the real `positionBucket` union values in `lib/publications/status-display.ts` before writing the fixture (`'middle'` may differ — use an actual member).

Run: `npx vitest run lib/publications/recap.test.ts` — Expected: FAIL.

**Step 2: Implement** (`lib/publications/recap.ts`)

```ts
import type { MyPublicationItem } from '@/lib/services/publications/my-publications'
import type { ArticleStatusValue } from '@/lib/services/publications/articles'

export const RECAP_STATUSES = ['IN_PREPARATION', 'UNDER_REVIEW', 'TO_RESUBMIT'] as const
export type RecapStatusValue = (typeof RECAP_STATUSES)[number]

export type RecapArticle = {
  id: string
  title: string
  status: RecapStatusValue
  journalName: string | null
  order: number
  totalAuthors: number
}

function isRecapStatus(status: ArticleStatusValue): status is RecapStatusValue {
  return (RECAP_STATUSES as readonly string[]).includes(status)
}

export function selectRecapArticles(items: MyPublicationItem[]): RecapArticle[] {
  return items
    .filter((publication) => isRecapStatus(publication.status))
    .map((publication) => ({
      id: publication.id,
      title: publication.title,
      status: publication.status as RecapStatusValue,
      journalName: publication.currentJournal,
      order: publication.order,
      totalAuthors: publication.totalAuthors,
    }))
}
```

Note: if the narrowing works via the type guard, drop the `as RecapStatusValue` cast (no `as` when avoidable).

**Step 3: Run tests** — Expected: PASS.

**Step 4: Recipients service** (`lib/services/publications/recap.ts`)

```ts
import { prisma } from '@/lib/prisma'

export type PublicationsRecapRecipient = {
  id: string
  email: string
  firstName: string | null
  language: 'EN' | 'FR'
}

export async function getPublicationsRecapRecipients(): Promise<PublicationsRecapRecipient[]> {
  const users = await prisma.user.findMany({
    where: {
      applications: { has: 'PUBLICATIONS' },
      OR: [{ publicationsEmailOptOut: false }, { publicationsEmailOptOut: null }],
    },
    select: { id: true, email: true, firstName: true, language: true },
  })
  return users
}
```

Check in `prisma/schema.prisma` whether `publicationsEmailOptOut` is nullable (`Boolean?`) or `Boolean @default(false)` — if non-nullable, the `where` is simply `publicationsEmailOptOut: false`. Adjust accordingly.

**Step 5: Commit**

```bash
git add lib/publications/recap.ts lib/publications/recap.test.ts lib/services/publications/recap.ts
git commit -m "feat(publications): recap article selection and recipient query"
```

---

### Task 4: Recap email renderer + sender

**Files:**
- Modify: `lib/services/email.ts` (append, following the `renderLeaveRecapEmail`/`sendLeaveRecapEmail` pattern at lines 362–587)
- Test: `lib/services/email.test.ts` (append)

**Step 1: Write the failing tests**

```ts
import { renderPublicationsRecapEmail } from './email'

describe('renderPublicationsRecapEmail', () => {
  const articles = [
    { id: '1', title: 'AI in cardiac MRI', status: 'UNDER_REVIEW' as const, journalName: 'JACC', order: 1, totalAuthors: 6 },
    { id: '2', title: 'Valve outcomes', status: 'IN_PREPARATION' as const, journalName: null, order: 3, totalAuthors: 4 },
  ]

  it('renders French subject, statuses, journal fallback and app link', () => {
    const { subject, text, html } = renderPublicationsRecapEmail({
      locale: 'fr', firstName: 'Marie', articles, appUrl: 'https://portal.test',
    })
    expect(subject).toContain('publications')
    expect(text).toContain('AI in cardiac MRI')
    expect(text).toContain('En review')
    expect(text).toContain('JACC')
    expect(text).toContain('En préparation')
    expect(html).toContain('https://portal.test/fr/publications')
    expect(html).toContain('Marie')
    expect(html).toContain('1/6')
  })

  it('renders English labels for EN users', () => {
    const { text, html } = renderPublicationsRecapEmail({
      locale: 'en', firstName: null, articles, appUrl: 'https://portal.test',
    })
    expect(text).toContain('Under review')
    expect(html).toContain('https://portal.test/en/publications')
  })
})
```

Run: `npx vitest run lib/services/email.test.ts` — Expected: FAIL.

**Step 2: Implement in `lib/services/email.ts`**

```ts
import type { RecapArticle, RecapStatusValue } from '@/lib/publications/recap'

export type PublicationsRecapEmailParams = {
  locale: 'en' | 'fr'
  firstName: string | null
  articles: RecapArticle[]
  appUrl: string
}

const PUBLICATION_STATUS_STYLE: Record<RecapStatusValue, { bgColor: string; label: Record<'fr' | 'en', string> }> = {
  IN_PREPARATION: { bgColor: '#64748b', label: { fr: 'En préparation', en: 'In preparation' } },
  UNDER_REVIEW: { bgColor: '#f59e0b', label: { fr: 'En review', en: 'Under review' } },
  TO_RESUBMIT: { bgColor: '#ef4444', label: { fr: 'À resoumettre', en: 'To resubmit' } },
}

export function renderPublicationsRecapEmail({ locale, firstName, articles, appUrl }: PublicationsRecapEmailParams): { subject: string; text: string; html: string } {
  const subject = locale === 'fr' ? 'Vos publications en cours — récap mensuel' : 'Your in-progress publications — monthly recap'
  const greeting = firstName ? (locale === 'fr' ? `Bonjour ${firstName},` : `Hello ${firstName},`) : locale === 'fr' ? 'Bonjour,' : 'Hello,'
  const intro = locale === 'fr'
    ? 'Voici l’état de vos publications en cours dans le portail :'
    : 'Here is the current state of your in-progress publications in the portal:'
  const cta = locale === 'fr'
    ? 'Si un statut ou une information n’est plus exact, merci de le mettre à jour dans l’app.'
    : 'If a status or any detail is no longer accurate, please update it in the app.'
  const buttonLabel = locale === 'fr' ? 'Ouvrir mes publications' : 'Open my publications'
  const link = `${appUrl}/${locale}/publications`
  const noJournal = locale === 'fr' ? 'aucun journal visé' : 'no target journal'
  const positionLabel = locale === 'fr' ? 'position auteur' : 'author position'

  const textLines = articles.map((article) => {
    const statusLabel = PUBLICATION_STATUS_STYLE[article.status].label[locale]
    return `- ${article.title} [${statusLabel}] — ${article.journalName ?? noJournal} — ${positionLabel} ${article.order}/${article.totalAuthors}`
  })
  const text = `${greeting}\n\n${intro}\n\n${textLines.join('\n')}\n\n${cta}\n${link}`

  const rowsHtml = articles.map((article) => {
    const style = PUBLICATION_STATUS_STYLE[article.status]
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};">${article.title}<br /><span style="font-size:12px;color:${COLORS.mutedForeground};">${article.journalName ?? noJournal} · ${article.order}/${article.totalAuthors}</span></td>
      <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};text-align:right;white-space:nowrap;"><span style="background-color:${style.bgColor};border-radius:4px;padding:3px 8px;font-family:${FONT_SANS};font-size:11px;color:#ffffff;">${style.label[locale]}</span></td>
    </tr>`
  }).join('')

  const body = `<p style="margin:0 0 16px 0;font-family:${FONT_SANS};font-size:15px;color:${COLORS.foreground};">${greeting}</p>
    <p style="margin:0 0 16px 0;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};">${intro}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}</table>
    <p style="margin:20px 0 16px 0;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};">${cta}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
      <td style="background-color:${COLORS.primary};border-radius:8px;">
        <a href="${link}" style="display:inline-block;padding:12px 28px;font-family:${FONT_SANS};font-size:14px;font-weight:bold;color:${COLORS.primaryForeground};text-decoration:none;">${buttonLabel}</a>
      </td>
    </tr></table>`

  return { subject, text, html: emailLayout(body, subject) }
}

export async function sendPublicationsRecapEmail(params: PublicationsRecapEmailParams & { to: string }): Promise<{ id: string } | { error: string }> {
  const { subject, text, html } = renderPublicationsRecapEmail(params)
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: 'RESEND_API_KEY missing' }
  const fromEmail = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const from = `Larib Portal <${fromEmail}>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [params.to], subject, text, html }),
  })
  if (!res.ok) return { error: `RESEND_REQUEST_FAILED_${res.status}` }
  const json = (await res.json()) as { id?: string }
  return { id: json.id ?? '' }
}
```

Match the exact status label wording already used in the app UI: check the `publications` namespace in `messages/fr.json` / `messages/en.json` (keys like `status.UNDER_REVIEW`) and reuse those French/English labels in `PUBLICATION_STATUS_STYLE` so email and app say the same thing. Adjust the test expectations to those labels.

**Step 3: Run tests** — Expected: PASS.

**Step 4: Commit**

```bash
git add lib/services/email.ts lib/services/email.test.ts
git commit -m "feat(publications): monthly recap email renderer and sender"
```

---

### Task 5: Cron route + vercel.json

**Files:**
- Create: `app/api/cron/publications-recap/route.ts`
- Modify: `vercel.json`

**Step 1: Implement the route** (mirror `app/api/cron/conges-recap/route.ts`)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { getPublicationsRecapRecipients } from '@/lib/services/publications/recap'
import { listMyPublications } from '@/lib/services/publications/my-publications'
import { selectRecapArticles } from '@/lib/publications/recap'
import { sendPublicationsRecapEmail } from '@/lib/services/email'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'cron_secret_missing' }, { status: 500 })
  }
  if (!isAuthorizedCron(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    return NextResponse.json({ error: 'app_url_missing' }, { status: 500 })
  }

  const recipients = await getPublicationsRecapRecipients()
  let sent = 0
  let skipped = 0
  let failures = 0

  for (const recipient of recipients) {
    const publications = await listMyPublications(recipient.id)
    const articles = selectRecapArticles(publications)
    if (articles.length === 0) {
      skipped += 1
      continue
    }
    const result = await sendPublicationsRecapEmail({
      to: recipient.email,
      locale: recipient.language === 'FR' ? 'fr' : 'en',
      firstName: recipient.firstName,
      articles,
      appUrl,
    })
    if ('error' in result) {
      failures += 1
      console.error(`[publications-recap] send failed (${recipient.email}): ${result.error}`)
    } else {
      sent += 1
    }
  }

  return NextResponse.json({ recipients: recipients.length, sent, skipped, failures })
}
```

**Step 2: Add the cron entry** in `vercel.json`:

```json
{ "path": "/api/cron/publications-recap", "schedule": "0 6 1 * *" }
```

**Step 3: Smoke test locally**

Run: `npm run build` (or if the dev server is running: `curl -s -H "Authorization: Bearer $(grep '^CRON_SECRET' .env | cut -d '=' -f2- | tr -d '\"')" http://localhost:3000/api/cron/publications-recap`)
Expected: JSON `{ recipients, sent, skipped, failures }` — with a real send only if RESEND key is set; watch out not to spam real users from the dev DB. Prefer just the build check.

**Step 4: Commit**

```bash
git add app/api/cron/publications-recap/route.ts vercel.json
git commit -m "feat(publications): monthly recap cron route"
```

---

### Task 6: Profile opt-out checkbox

**Files:**
- Modify: `actions/profile.ts` (`updateSelfProfileAction`: add `publicationsEmailOptOut: z.boolean().optional()` to the schema and pass it through to the Prisma update)
- Modify: `app/[locale]/profile/profile-editor.tsx` (add a shadcn `Switch` or `Checkbox` row, visible only when the user has the Publications app)
- Modify: `app/[locale]/profile/page.tsx` (pass `publicationsEmailOptOut` and a `hasPublicationsApp` boolean derived from the session user)
- Modify: `messages/fr.json` / `messages/en.json` (profile namespace):
  - fr: `"publicationsEmailOptOut": "Ne plus recevoir le récap mensuel Publications"`
  - en: `"publicationsEmailOptOut": "Stop receiving the monthly Publications recap"`

**Step 1:** Read `actions/profile.ts` and `profile-editor.tsx` fully before editing; follow their existing form patterns (React Hook Form + useAction + sonner toast already present).

**Step 2:** Implement schema + UI. Success/error toasts already exist for this form — no new ones needed.

**Step 3: Verify**

Run: `npx vitest run && npm run build` — Expected: PASS / compiles.

**Step 4: Commit**

```bash
git add actions/profile.ts "app/[locale]/profile" messages
git commit -m "feat(publications): expose monthly recap opt-out in profile"
```

---

### Task 7: Carousel email draft builder (pure)

**Files:**
- Create: `lib/publications/carousel-email.ts`
- Test: `lib/publications/carousel-email.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { buildCarouselEmailDraft, CAROUSEL_CC_RECIPIENTS } from './carousel-email'

describe('buildCarouselEmailDraft', () => {
  const params = {
    articleTitle: 'AI in cardiac MRI',
    journalName: 'European Heart Journal',
    firstAuthor: { firstName: 'Marie', lastName: 'Dupont', email: 'marie@chu.fr' },
    lastAuthor: { firstName: 'Jean', lastName: 'Martin' },
  }

  it('fills subject, recipients and every placeholder of the body', () => {
    const draft = buildCarouselEmailDraft(params)
    expect(draft.subject).toBe('Félicitations — AI in cardiac MRI')
    expect(draft.to).toBe('marie@chu.fr')
    expect(draft.cc).toEqual(CAROUSEL_CC_RECIPIENTS)
    expect(draft.body).toContain('Bonjour Marie DUPONT,')
    expect(draft.body).toContain('« AI in cardiac MRI »')
    expect(draft.body).toContain('European Heart Journal')
    expect(draft.body).toContain('Jean MARTIN')
    expect(draft.body).not.toContain('[')
  })

  it('degrades gracefully without journal, last author or email', () => {
    const draft = buildCarouselEmailDraft({
      articleTitle: 'T', journalName: null, firstAuthor: { firstName: 'A', lastName: 'B', email: null }, lastAuthor: null,
    })
    expect(draft.to).toBe('')
    expect(draft.body).toContain('le journal')
    expect(draft.body).not.toContain('null')
  })
})
```

Run: `npx vitest run lib/publications/carousel-email.test.ts` — Expected: FAIL.

**Step 2: Implement** (`lib/publications/carousel-email.ts`)

```ts
export const CAROUSEL_CC_RECIPIENTS = [
  'camille.gersdorff.com@gmail.com',
  'theo.pezelccf@gmail.com',
  'solenn.toupin@gmail.com',
  'brahim.melarbi@gmail.com',
] as const

export const CAROUSEL_REPLY_TO = 'camille.gersdorff.com@gmail.com'

export type CarouselAuthor = { firstName: string; lastName: string }

export type CarouselEmailDraftParams = {
  articleTitle: string
  journalName: string | null
  firstAuthor: CarouselAuthor & { email: string | null }
  lastAuthor: CarouselAuthor | null
}

export type CarouselEmailDraft = {
  to: string
  cc: readonly string[]
  subject: string
  body: string
}

function fullName(author: CarouselAuthor): string {
  return `${author.firstName} ${author.lastName.toUpperCase()}`
}

export function buildCarouselEmailDraft(params: CarouselEmailDraftParams): CarouselEmailDraft {
  const journal = params.journalName ?? 'le journal'
  const senior = params.lastAuthor ? fullName(params.lastAuthor) : 'le dernier auteur'
  const body = `Bonjour ${fullName(params.firstAuthor)},

Toutes mes félicitations pour l'acceptation de ton article intitulé « ${params.articleTitle} » dans ${journal} !

Afin de préparer un carrousel LinkedIn mettant en valeur tes travaux, je te serais reconnaissant(e) de bien vouloir me transmettre les éléments suivants :

- Le PDF ou le lien vers l'article accepté pour publication.
- Les logos à intégrer (journal, universités, centres partenaires, sociétés savantes, etc.) en haute définition, au format PNG de préférence.
- 4 à 6 messages clés que tu souhaites faire ressortir de l'article, formulés en une phrase maximum chacun. L'objectif est qu'un lecteur non spécialiste puisse saisir les principaux résultats en quelques secondes, sans avoir à lire l'article.
- Les figures, graphiques ou images à mettre en avant (en haute définition), en précisant pour chacune le message clé associé.
- Le cas échéant, les questions ouvertes, limites de l'étude ou pistes de réflexion que tu souhaiterais mentionner en fin de carrousel (2 phrases maximum).
- Les personnes ou structures à citer en plus des co-auteurs (financeurs, équipes de recherche, hôpitaux, partenaires, etc.).

N'hésite pas à me signaler tout ce qui te semblerait pertinent pour valoriser tes travaux auprès d'un public non spécialiste.

Pour t'inspirer, je te joins un exemple de post réalisé pour un ancien article que nous avons publié. Le post sera vérifié par le senior de l'étude — merci de confirmer s'il s'agit bien de ${senior} — avant d'être publié sur le compte LinkedIn du service de cardiologie ou de MIRACL.ai selon le contexte de l'étude.

Merci de me transmettre ces éléments d'ici une semaine afin de respecter le calendrier de publication.

Encore toutes mes félicitations, et merci pour ton aide !`

  return {
    to: params.firstAuthor.email ?? '',
    cc: CAROUSEL_CC_RECIPIENTS,
    subject: `Félicitations — ${params.articleTitle}`,
    body,
  }
}
```

**Step 3: Run tests** — Expected: PASS.

**Step 4: Commit**

```bash
git add lib/publications/carousel-email.ts lib/publications/carousel-email.test.ts
git commit -m "feat(publications): carousel request email draft builder"
```

---

### Task 8: Carousel data service + generic sender

**Files:**
- Create: `lib/services/publications/carousel-email.ts`
- Modify: `lib/services/email.ts` (append `sendCarouselRequestEmail`)
- Test: `lib/services/email.test.ts` (renderer part only)

**Step 1: Data service** (`lib/services/publications/carousel-email.ts`)

```ts
import { prisma } from '@/lib/prisma'
import { buildCarouselEmailDraft, type CarouselEmailDraft } from '@/lib/publications/carousel-email'

export type CarouselEmailData = {
  draft: CarouselEmailDraft
  sentAt: Date | null
  missingFirstAuthorEmail: boolean
}

export async function getCarouselEmailData(articleId: string): Promise<CarouselEmailData | null> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      title: true,
      carouselEmailSentAt: true,
      publishedJournal: { select: { name: true } },
      submissions: {
        orderBy: { submittedAt: 'asc' },
        select: { status: true, journal: { select: { name: true } } },
      },
      authorships: {
        orderBy: { order: 'asc' },
        select: {
          author: {
            select: { firstName: true, lastName: true, email: true, emails: true, user: { select: { email: true } } },
          },
        },
      },
    },
  })
  if (!article) return null

  const acceptedSubmission = article.submissions.find((submission) => submission.status === 'ACCEPTED')
  const latestSubmission = article.submissions.at(-1)
  const journalName =
    acceptedSubmission?.journal.name ?? latestSubmission?.journal.name ?? article.publishedJournal?.name ?? null

  const first = article.authorships.at(0)?.author ?? null
  const last = article.authorships.length > 1 ? article.authorships.at(-1)?.author ?? null : null
  const firstEmail = first ? first.email ?? first.emails.at(0) ?? first.user?.email ?? null : null

  const draft = buildCarouselEmailDraft({
    articleTitle: article.title,
    journalName,
    firstAuthor: { firstName: first?.firstName ?? '', lastName: first?.lastName ?? '', email: firstEmail },
    lastAuthor: last ? { firstName: last.firstName, lastName: last.lastName } : null,
  })

  return { draft, sentAt: article.carouselEmailSentAt, missingFirstAuthorEmail: !firstEmail }
}

export async function markCarouselEmailSent(articleId: string, sentAt: Date): Promise<void> {
  await prisma.article.update({ where: { id: articleId }, data: { carouselEmailSentAt: sentAt }, select: { id: true } })
}
```

**Step 2: Sender in `lib/services/email.ts`** — HTML = simple paragraphs from the edited plain-text body, wrapped in `emailLayout`:

```ts
export type CarouselRequestEmailParams = {
  to: string
  cc: string[]
  replyTo: string
  subject: string
  body: string
}

export function renderCarouselRequestEmailHtml(body: string): string {
  const paragraphs = body
    .split('\n')
    .map((line) => escapeHtml(line))
    .map((line) => (line.trim() === '' ? '<br />' : `<p style="margin:0 0 4px 0;font-family:${FONT_SANS};font-size:14px;line-height:21px;color:${COLORS.foreground};">${line}</p>`))
    .join('')
  return emailLayout(paragraphs)
}

export async function sendCarouselRequestEmail(params: CarouselRequestEmailParams): Promise<{ id: string } | { error: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: 'RESEND_API_KEY missing' }
  const fromEmail = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const from = `Larib Portal <${fromEmail}>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [params.to],
      cc: params.cc,
      reply_to: params.replyTo,
      subject: params.subject,
      text: params.body,
      html: renderCarouselRequestEmailHtml(params.body),
    }),
  })
  if (!res.ok) return { error: `RESEND_REQUEST_FAILED_${res.status}` }
  const json = (await res.json()) as { id?: string }
  return { id: json.id ?? '' }
}
```

If `lib/services/email.ts` has no `escapeHtml` helper yet, add one (`&`, `<`, `>`, `"`). Check first — one may exist.

**Step 3: Test the HTML renderer** (append to `lib/services/email.test.ts`): body lines become paragraphs, HTML is escaped (`<script>` → `&lt;script&gt;`), blank lines become `<br />`.

Run: `npx vitest run lib/services/email.test.ts` — Expected: PASS.

**Step 4: Commit**

```bash
git add lib/services/publications/carousel-email.ts lib/services/email.ts lib/services/email.test.ts
git commit -m "feat(publications): carousel email data service and sender"
```

---

### Task 9: Server actions — prepare & send

**Files:**
- Modify: `app/[locale]/publications/actions.ts` (append)

**Step 1: Implement both actions**

```ts
export const prepareCarouselEmailAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ articleId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const data = await getCarouselEmailData(parsedInput.articleId)
    if (!data) throw new Error('NOT_FOUND')
    return data
  })

export const sendCarouselEmailAction = appAdminAction('PUBLICATIONS')
  .inputSchema(
    z.object({
      articleId: z.string().min(1),
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
    }),
  )
  .action(async ({ parsedInput }) => {
    const result = await sendCarouselRequestEmail({
      to: parsedInput.to,
      cc: [...CAROUSEL_CC_RECIPIENTS],
      replyTo: CAROUSEL_REPLY_TO,
      subject: parsedInput.subject,
      body: parsedInput.body,
    })
    if ('error' in result) throw new Error(result.error)
    const sentAt = new Date()
    await markCarouselEmailSent(parsedInput.articleId, sentAt)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return { sentAt: sentAt.toISOString() }
  })
```

Cc is intentionally fixed server-side (constant), only To/subject/body are editable in the dialog.

**Step 2: Verify** — `npm run build` compiles.

**Step 3: Commit**

```bash
git add "app/[locale]/publications/actions.ts"
git commit -m "feat(publications): server actions to prepare and send the carousel email"
```

---

### Task 10: i18n messages for the dialog and badges

**Files:**
- Modify: `messages/fr.json`, `messages/en.json` — under the `publications` namespace, new `carouselEmail` block:

| key | fr | en |
|---|---|---|
| `dialogTitle` | Mail carrousel LinkedIn | LinkedIn carousel email |
| `dialogDescription` | Relis et ajuste le mail avant envoi au 1er auteur. | Review and adjust the email before sending it to the first author. |
| `toLabel` | Destinataire (1er auteur) | Recipient (first author) |
| `ccLabel` | En copie | Cc |
| `subjectLabel` | Objet | Subject |
| `bodyLabel` | Message | Message |
| `missingEmail` | Aucune adresse connue pour le 1er auteur — saisis-la manuellement. | No known address for the first author — type it manually. |
| `send` | Envoyer | Send |
| `later` | Plus tard | Later |
| `sentToast` | Mail carrousel envoyé | Carousel email sent |
| `errorToast` | Échec de l'envoi du mail | Failed to send the email |
| `badgeSent` | Mail carrousel envoyé le {date} | Carousel email sent on {date} |
| `badgeNotSent` | Mail carrousel non envoyé | Carousel email not sent |
| `openDialog` | Préparer le mail carrousel | Prepare carousel email |

**Step 1:** Add the keys to both files (keep alphabetical/structural consistency with the namespace).

**Step 2:** `npx vitest run` (an i18n key-parity test may exist — if it fails, fix keys). `npm run build`.

**Step 3: Commit**

```bash
git add messages
git commit -m "chore(i18n): carousel email dialog messages"
```

---

### Task 11: Dialog component + trigger in the article editor

**Files:**
- Create: `app/[locale]/publications/components/article/carousel-email-dialog.tsx`
- Modify: `app/[locale]/publications/components/article/article-page.tsx`

**Step 1: Dialog component** (client). Props kept ≤ 5 via a single object:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { prepareCarouselEmailAction, sendCarouselEmailAction } from '../../actions'

export type CarouselEmailDialogState = {
  articleId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent?: () => void
}

export function CarouselEmailDialog({ state }: { state: CarouselEmailDialogState }) { ... }
```

Behavior:
- When `open` becomes true, call `prepareCarouselEmailAction` (via `useAction` executed from the open-change handler — no useEffect) and fill local state: `to`, `subject`, `body`, `cc` (display-only), `missingFirstAuthorEmail` warning.
- To/subject/body are editable (`Input`, `Input`, `Textarea rows={18}`); Cc shown as muted text.
- « Envoyer » executes `sendCarouselEmailAction`; success → `toast.success(t('carouselEmail.sentToast'))`, close, `router.refresh()`; error → `toast.error(t('carouselEmail.errorToast'))`.
- « Plus tard » just closes.
- Empty To disables « Envoyer » and shows `missingEmail` hint.

**Step 2: Trigger in `article-page.tsx`**

- Add state `const [carouselOpen, setCarouselOpen] = useState(false)`.
- Track status before save: in `onSave`, capture `const statusBefore = article.status` (from props; it reflects the persisted value) and in `save`'s `onSuccess`, if `viewer.isAdmin && statusBefore !== 'ACCEPTED' && values.status === 'ACCEPTED'` → `setCarouselOpen(true)`. The submitted values are available via `form.getValues()` in `onSuccess`; simplest correct approach: in `onSave`, after `save.execute(...)` succeeds via the hook's `onSuccess`, read `form.getValues('status')` and compare to the initial `defaults.status` captured at mount. Note: `router.refresh()` already runs on success — the dialog state survives a refresh because the component instance persists.
- Render `<CarouselEmailDialog state={{ articleId: article.id, open: carouselOpen, onOpenChange: setCarouselOpen }} />`.

**Step 3: Manual check** — `npm run build` compiles.

**Step 4: Commit**

```bash
git add "app/[locale]/publications/components/article" 
git commit -m "feat(publications): carousel email dialog opens when an article becomes accepted"
```

---

### Task 12: Sent/not-sent badge on the admin dashboard

**Files:**
- Modify: `lib/publications/admin-dashboard.ts` (`DashboardArticleItem`: add `carouselEmailSentAt: string | null`)
- Modify: `lib/services/publications/dashboard.ts` (select the new column and map it)
- Modify: `app/[locale]/publications/components/articles/article-list-row.tsx` (in the admin expanded row or status cell: when `article.status === 'ACCEPTED'`, render the badge `badgeSent`/`badgeNotSent` and a button `openDialog` opening `CarouselEmailDialog` for that article)

**Step 1:** Read `article-list-row.tsx` and `lib/publications/admin-dashboard.ts` fully first; place the badge where the admin-only controls already live (the `admin` prop section), styled with existing badge conventions (semantic colors — no coral in badges).

**Step 2:** Add the field through service + type + UI. The dialog is mounted once per row on demand (render only when opened, guard with local state).

**Step 3:** If `lib/publications/admin-dashboard.ts` has unit tests, extend them for the new field mapping.

Run: `npx vitest run && npm run build` — Expected: PASS.

**Step 4: Commit**

```bash
git add lib/publications/admin-dashboard.ts lib/services/publications/dashboard.ts "app/[locale]/publications/components/articles/article-list-row.tsx"
git commit -m "feat(publications): carousel email badge and manual send from admin dashboard"
```

---

### Task 13: E2E test

**Files:**
- Create: `tests/e2e/publications-carousel-email.spec.ts`
- Possibly modify: `prisma/seed.test.ts` (ensure an article exists with authors incl. emails, status UNDER_REVIEW, owned by the publications admin's scope)

**Step 1:** Check `prisma/seed.test.ts` for existing publications fixtures (articles + authorships with `order`). Ensure one seeded article has ≥ 2 authors, first author with an email, status `UNDER_REVIEW`. Add if missing.

**Step 2: Write one comprehensive flow** (CLAUDE.md style — one journey, not micro-tests):

```ts
import { test, expect } from '@playwright/test'

test('admin accepts an article, reviews the carousel email, defers it, and sees the not-sent badge', async ({ page }) => {
  // login as publications-admin@larib-portal.test (reuse the login helper pattern from existing publications specs)
  // navigate to the seeded article's edit page, switch status to Accepted, save
  // expect dialog visible: pre-filled subject « Félicitations — ... », body contains first author name and journal, To filled
  // click « Plus tard » — dialog closes
  // go to /publications/admin, find the article row: badge "not sent" visible
  // click « Préparer le mail carrousel » — dialog reopens pre-filled
  // close; no email is actually sent (no Resend key in test env)
})
```

Mirror login/navigation helpers from an existing spec (e.g. `tests/e2e/publications-*.spec.ts`).

**Step 3:** Run: `npm run test:seed && PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/publications-carousel-email.spec.ts` — Expected: PASS. (Memory: always PLAYWRIGHT_PORT=3100, kill orphan servers first.)

**Step 4: Commit**

```bash
git add tests/e2e/publications-carousel-email.spec.ts prisma/seed.test.ts
git commit -m "test(publications): e2e coverage for the carousel email flow"
```

---

### Task 14: Full validation and push

**Step 1:** `git branch --show-current` — must be `main` (parallel sessions may switch it).

**Step 2:** Run: `npm run verify:push` — fix and rerun until fully green. Never weaken tests.

**Step 3:** `git push` (pre-push hook re-runs validation; allow 10+ minutes).

**Step 4:** Confirm deployment: `vercel ls` shows the new deployment building/ready. Remind Solenn that the Vercel cron only fires in production and that `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_APP_URL` must exist in the Vercel env.
