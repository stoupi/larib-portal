# Récupération des PDF en accès libre — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Un bouton « Chercher le PDF en ligne » sur les publications acceptées ou publiées, qui récupère le PDF en accès libre, le dépose sur R2 et l'attache à l'article.

**Architecture:** La logique risquée (URLs, lecture des réponses JSON, détection d'un vrai PDF) vit dans un module **pur** `lib/publications/open-access-pdf.ts`, testé sans réseau. Un **service** `lib/services/publications/open-access-pdf.ts` l'enveloppe avec les appels HTTP et un court-circuit par fixtures (`OPEN_ACCESS_FIXTURE_DIR`), comme `pubmed.ts`. Une **route API** décalquée de l'upload PDF existant fait autorité sur les droits, télécharge, vérifie et envoie sur R2 ; l'écriture en base réutilise `saveArticlePdfAction`.

**Tech Stack:** Next.js 15 (App Router), TypeScript strict, vitest (unitaire), Playwright (E2E), Cloudflare R2 via `@aws-sdk/client-s3`, next-intl, next-safe-action.

**Design de référence:** `docs/superpowers/plans/2026-08-11-open-access-pdf-fetch-design.md`

**Sources vérifiées en direct le 2026-08-11:**
- PMID → PMCID : `https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/?ids={pmid}&format=json` → `records[0].pmcid` (ou `records[0].status === 'error'`)
- PDF PMC : `https://europepmc.org/articles/{PMCID}?pdf=render` → 200, `application/pdf`
- Unpaywall : `https://api.unpaywall.org/v2/{doi}?email={contact}` → `best_oa_location.url_for_pdf`. **Exige une adresse e-mail réelle** (sinon 422).

---

## Task 1: Module pur — URLs et lecture des réponses

**Files:**
- Create: `lib/publications/open-access-pdf.ts`
- Test: `lib/publications/open-access-pdf.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import {
  idConverterUrl,
  europePmcPdfUrl,
  unpaywallUrl,
  readPmcId,
  readUnpaywallPdfUrl,
  looksLikePdf,
} from './open-access-pdf'

describe('idConverterUrl', () => {
  it('builds the NCBI id converter url from a bare pmid', () => {
    expect(idConverterUrl('34512303', null)).toBe(
      'https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/?ids=34512303&format=json&tool=larib-portal',
    )
  })

  it('adds the courtesy email when one is configured', () => {
    expect(idConverterUrl('34512303', 'contact@larib.test')).toContain('&email=contact%40larib.test')
  })

  it('rejects anything that is not a bare pmid', () => {
    expect(idConverterUrl('not-a-pmid', null)).toBeNull()
    expect(idConverterUrl('', null)).toBeNull()
  })

  it('accepts a pasted PubMed url or a PMID: prefix', () => {
    expect(idConverterUrl('PMID: 34512303', null)).toContain('ids=34512303')
    expect(idConverterUrl('https://pubmed.ncbi.nlm.nih.gov/34512303/', null)).toContain('ids=34512303')
  })
})

describe('europePmcPdfUrl', () => {
  it('builds the render url from a pmcid', () => {
    expect(europePmcPdfUrl('PMC8425557')).toBe('https://europepmc.org/articles/PMC8425557?pdf=render')
  })

  it('rejects a pmcid that is not shaped like one', () => {
    expect(europePmcPdfUrl('8425557')).toBeNull()
    expect(europePmcPdfUrl('../etc/passwd')).toBeNull()
  })
})

describe('unpaywallUrl', () => {
  it('keeps the doi slashes unescaped and carries the contact email', () => {
    expect(unpaywallUrl('10.3389/fnagi.2021.686506', 'contact@larib.test')).toBe(
      'https://api.unpaywall.org/v2/10.3389/fnagi.2021.686506?email=contact%40larib.test',
    )
  })

  it('strips a doi.org prefix before building the url', () => {
    expect(unpaywallUrl('https://doi.org/10.3389/fnagi.2021.686506', 'contact@larib.test')).toContain(
      '/v2/10.3389/fnagi.2021.686506',
    )
  })

  it('returns null without a contact email — the api refuses anonymous calls', () => {
    expect(unpaywallUrl('10.3389/fnagi.2021.686506', null)).toBeNull()
  })
})

describe('readPmcId', () => {
  it('reads the pmcid of a deposited article', () => {
    expect(readPmcId({ records: [{ pmcid: 'PMC8425557', pmid: 34512303 }] })).toBe('PMC8425557')
  })

  it('returns null when the article is not in PMC', () => {
    expect(readPmcId({ records: [{ pmid: 27141953, status: 'error', errmsg: 'Identifier not found in PMC' }] })).toBeNull()
    expect(readPmcId({ records: [] })).toBeNull()
    expect(readPmcId({})).toBeNull()
    expect(readPmcId(null)).toBeNull()
  })
})

describe('readUnpaywallPdfUrl', () => {
  it('prefers the best open access location', () => {
    const payload = {
      is_oa: true,
      best_oa_location: { url_for_pdf: 'https://example.test/best.pdf' },
      oa_locations: [{ url_for_pdf: 'https://example.test/other.pdf' }],
    }
    expect(readUnpaywallPdfUrl(payload)).toBe('https://example.test/best.pdf')
  })

  it('falls back to the first location that carries a pdf', () => {
    const payload = {
      is_oa: true,
      best_oa_location: { url_for_pdf: null, url: 'https://example.test/landing' },
      oa_locations: [{ url_for_pdf: null }, { url_for_pdf: 'https://example.test/repo.pdf' }],
    }
    expect(readUnpaywallPdfUrl(payload)).toBe('https://example.test/repo.pdf')
  })

  it('returns null for a closed article, an error body or junk', () => {
    expect(readUnpaywallPdfUrl({ is_oa: false, best_oa_location: null, oa_locations: [] })).toBeNull()
    expect(readUnpaywallPdfUrl({ error: true, message: 'Please use your own email address in API calls' })).toBeNull()
    expect(readUnpaywallPdfUrl(null)).toBeNull()
  })

  it('ignores a non-http url', () => {
    expect(readUnpaywallPdfUrl({ best_oa_location: { url_for_pdf: 'ftp://example.test/x.pdf' } })).toBeNull()
  })
})

describe('looksLikePdf', () => {
  const pdfHead = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])

  it('accepts a pdf content type with a %PDF header', () => {
    expect(looksLikePdf('application/pdf', pdfHead)).toBe(true)
    expect(looksLikePdf('application/pdf; charset=binary', pdfHead)).toBe(true)
  })

  it('accepts a %PDF header even when the server sends a vague content type', () => {
    expect(looksLikePdf('application/octet-stream', pdfHead)).toBe(true)
  })

  it('rejects a login page dressed as a pdf', () => {
    const html = new TextEncoder().encode('<!DOCTYPE html>')
    expect(looksLikePdf('application/pdf', html)).toBe(false)
    expect(looksLikePdf('text/html', html)).toBe(false)
  })

  it('rejects an empty body', () => {
    expect(looksLikePdf('application/pdf', new Uint8Array())).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run lib/publications/open-access-pdf.test.ts`
Expected: FAIL — `Failed to resolve import "./open-access-pdf"`.

**Step 3: Write minimal implementation**

```ts
import { bareDoi } from './doi'
import { barePubmedId } from './pubmed-id'

export type OpenAccessSource = 'europepmc' | 'unpaywall'
export type OpenAccessPdf = { url: string; source: OpenAccessSource }

const ID_CONVERTER = 'https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/'
const UNPAYWALL = 'https://api.unpaywall.org/v2'
const TOOL_NAME = 'larib-portal'
const PMCID_PATTERN = /^PMC\d+$/
const PDF_MAGIC = '%PDF'

export function idConverterUrl(pubmedId: string | null, contactEmail: string | null): string | null {
  const identifier = barePubmedId(pubmedId)
  if (!identifier) return null
  const email = contactEmail ? `&email=${encodeURIComponent(contactEmail)}` : ''
  return `${ID_CONVERTER}?ids=${identifier}&format=json&tool=${TOOL_NAME}${email}`
}

export function europePmcPdfUrl(pmcid: string): string | null {
  const identifier = pmcid.trim().toUpperCase()
  if (!PMCID_PATTERN.test(identifier)) return null
  return `https://europepmc.org/articles/${identifier}?pdf=render`
}

export function unpaywallUrl(doi: string | null, contactEmail: string | null): string | null {
  const identifier = bareDoi(doi)
  if (!identifier || !contactEmail) return null
  return `${UNPAYWALL}/${identifier}?email=${encodeURIComponent(contactEmail)}`
}

type ConverterPayload = { records?: { pmcid?: string; status?: string }[] }

export function readPmcId(payload: unknown): string | null {
  const records = (payload as ConverterPayload | null)?.records
  if (!Array.isArray(records)) return null
  const found = records.find((record) => typeof record?.pmcid === 'string' && PMCID_PATTERN.test(record.pmcid))
  return found?.pmcid ?? null
}

type UnpaywallLocation = { url_for_pdf?: string | null }
type UnpaywallPayload = { best_oa_location?: UnpaywallLocation | null; oa_locations?: UnpaywallLocation[] | null }

function httpPdfUrl(candidate: string | null | undefined): string | null {
  if (typeof candidate !== 'string') return null
  return /^https?:\/\//i.test(candidate) ? candidate : null
}

export function readUnpaywallPdfUrl(payload: unknown): string | null {
  const body = payload as UnpaywallPayload | null
  const best = httpPdfUrl(body?.best_oa_location?.url_for_pdf)
  if (best) return best
  const locations = Array.isArray(body?.oa_locations) ? body.oa_locations : []
  for (const location of locations) {
    const fallback = httpPdfUrl(location?.url_for_pdf)
    if (fallback) return fallback
  }
  return null
}

export function looksLikePdf(contentType: string | null, head: Uint8Array): boolean {
  if (head.length < PDF_MAGIC.length) return false
  const magic = new TextDecoder().decode(head.subarray(0, PDF_MAGIC.length))
  if (magic !== PDF_MAGIC) return false
  const type = (contentType ?? '').toLowerCase()
  return type.length === 0 || type.includes('pdf') || type.includes('octet-stream')
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run lib/publications/open-access-pdf.test.ts`
Expected: PASS, tous les cas verts.

**Step 5: Commit**

```bash
git add lib/publications/open-access-pdf.ts lib/publications/open-access-pdf.test.ts
git commit -m "feat(publications): pure helpers for open access pdf lookup"
```

---

## Task 2: Service — enchaînement des sources

**Files:**
- Create: `lib/services/publications/open-access-pdf.ts`
- Test: `lib/services/publications/open-access-pdf.test.ts`

Le service fait les appels réseau. `OPEN_ACCESS_FIXTURE_DIR` court-circuite tout vers un fichier local — même mécanique que `PUBMED_FIXTURE_DIR` dans `lib/services/publications/pubmed.ts:7`.

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { findOpenAccessPdf } from './open-access-pdf'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('findOpenAccessPdf', () => {
  it('returns the Europe PMC url when the pmid is deposited in PMC', async () => {
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', 'contact@larib.test')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ records: [{ pmcid: 'PMC8425557' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const found = await findOpenAccessPdf({ pubmedId: '34512303', doi: '10.3389/fnagi.2021.686506' })

    expect(found).toEqual({ url: 'https://europepmc.org/articles/PMC8425557?pdf=render', source: 'europepmc' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to Unpaywall when the article is not in PMC', async () => {
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', 'contact@larib.test')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ records: [{ status: 'error', errmsg: 'Identifier not found in PMC' }] }))
      .mockResolvedValueOnce(jsonResponse({ is_oa: true, best_oa_location: { url_for_pdf: 'https://example.test/a.pdf' } }))
    vi.stubGlobal('fetch', fetchMock)

    const found = await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })

    expect(found).toEqual({ url: 'https://example.test/a.pdf', source: 'unpaywall' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns null when neither source has a pdf', async () => {
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', 'contact@larib.test')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ records: [{ status: 'error' }] }))
        .mockResolvedValueOnce(jsonResponse({ is_oa: false, best_oa_location: null, oa_locations: [] })),
    )

    expect(await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })).toBeNull()
  })

  it('keeps going when a source fails on the network', async () => {
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', 'contact@larib.test')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce(jsonResponse({ best_oa_location: { url_for_pdf: 'https://example.test/a.pdf' } })),
    )

    const found = await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })
    expect(found?.source).toBe('unpaywall')
  })

  it('skips Unpaywall when no contact email is configured', async () => {
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', '')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ records: [{ status: 'error' }] }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns null without querying anything when both identifiers are missing', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await findOpenAccessPdf({ pubmedId: null, doi: null })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats a non-ok response as an unavailable source', async () => {
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', 'contact@larib.test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 503 })))

    expect(await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run lib/services/publications/open-access-pdf.test.ts`
Expected: FAIL — module introuvable.

**Step 3: Write minimal implementation**

⚠️ Ne pas mettre `import 'server-only'` en tête : ce module est chargé par vitest. `pubmed.ts` le fait et n'est testé qu'à travers `pubmed-parse.ts` ; ici le service lui-même est testé, donc on s'en passe (la route API reste le seul point d'entrée).

```ts
import {
  idConverterUrl,
  europePmcPdfUrl,
  readPmcId,
  readUnpaywallPdfUrl,
  unpaywallUrl,
  type OpenAccessPdf,
} from '@/lib/publications/open-access-pdf'

const REQUEST_TIMEOUT_MS = 10_000

function contactEmail(): string | null {
  const configured = process.env.OPEN_ACCESS_CONTACT_EMAIL?.trim()
  return configured && configured.length > 0 ? configured : null
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

async function fromPubmedCentral(pubmedId: string | null): Promise<OpenAccessPdf | null> {
  const lookup = idConverterUrl(pubmedId, contactEmail())
  if (!lookup) return null
  const pmcid = readPmcId(await fetchJson(lookup))
  if (!pmcid) return null
  const url = europePmcPdfUrl(pmcid)
  return url ? { url, source: 'europepmc' } : null
}

async function fromUnpaywall(doi: string | null): Promise<OpenAccessPdf | null> {
  const lookup = unpaywallUrl(doi, contactEmail())
  if (!lookup) return null
  const url = readUnpaywallPdfUrl(await fetchJson(lookup))
  return url ? { url, source: 'unpaywall' } : null
}

async function readFixture(pubmedId: string | null, doi: string | null): Promise<OpenAccessPdf | null> {
  const { readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const raw = await readFile(join(process.env.OPEN_ACCESS_FIXTURE_DIR as string, 'resolutions.json'), 'utf8')
  const resolutions = JSON.parse(raw) as Record<string, OpenAccessPdf>
  const keys = [pubmedId, doi].filter((key): key is string => typeof key === 'string' && key.length > 0)
  for (const key of keys) {
    if (resolutions[key]) return resolutions[key]
  }
  return null
}

export async function findOpenAccessPdf({
  pubmedId,
  doi,
}: {
  pubmedId: string | null
  doi: string | null
}): Promise<OpenAccessPdf | null> {
  if (!pubmedId && !doi) return null
  if (process.env.OPEN_ACCESS_FIXTURE_DIR) return readFixture(pubmedId, doi)
  return (await fromPubmedCentral(pubmedId)) ?? (await fromUnpaywall(doi))
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run lib/services/publications/open-access-pdf.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/services/publications/open-access-pdf.ts lib/services/publications/open-access-pdf.test.ts
git commit -m "feat(publications): resolve open access pdf urls from PMC then Unpaywall"
```

---

## Task 3: Route API — téléchargement, vérification, dépôt sur R2

**Files:**
- Create: `app/api/publications/fetch-open-access-pdf/route.ts`
- Read first: `app/api/uploads/publication-pdf/route.ts` (le modèle à décalquer)

Pas de test unitaire ici : la route n'est que de l'assemblage sous authentification, et l'E2E de la Task 6 la traverse de bout en bout.

**Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { canAccessApp, canAdminApp } from '@/lib/permissions'
import { userIsFirstAuthor } from '@/lib/services/publications/publication-editor'
import { findOpenAccessPdf } from '@/lib/services/publications/open-access-pdf'
import { looksLikePdf } from '@/lib/publications/open-access-pdf'
import { r2PutObject } from '@/lib/services/r2-s3'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const MAX_PDF_BYTES = 30 * 1024 * 1024
const DOWNLOAD_TIMEOUT_MS = 30_000
const ELIGIBLE_STATUSES = ['ACCEPTED', 'PUBLISHED'] as const

export async function POST(request: NextRequest) {
  const session = await getTypedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!canAccessApp(session.user, 'PUBLICATIONS')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => null)) as { articleId?: unknown } | null
  const articleId = typeof body?.articleId === 'string' ? body.articleId : ''
  if (articleId.length === 0) return NextResponse.json({ error: 'article_missing' }, { status: 400 })

  const canEdit =
    canAdminApp(session.user, 'PUBLICATIONS') || (await userIsFirstAuthor(session.user.id, articleId))
  if (!canEdit) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { status: true, doi: true, pubmedId: true },
  })
  if (!article) return NextResponse.json({ error: 'article_missing' }, { status: 404 })
  if (!ELIGIBLE_STATUSES.some((status) => status === article.status)) {
    return NextResponse.json({ error: 'status_not_eligible' }, { status: 400 })
  }

  const found = await findOpenAccessPdf({ pubmedId: article.pubmedId, doi: article.doi })
  if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  try {
    const response = await fetch(found.url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    })
    if (!response.ok) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > MAX_PDF_BYTES) return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
    if (!looksLikePdf(response.headers.get('content-type'), bytes)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const uploaded = await r2PutObject(
      `publications/${articleId}/${Date.now()}-open-access.pdf`,
      Buffer.from(bytes),
      'application/pdf',
    )
    return NextResponse.json({ url: uploaded.url, key: uploaded.key, source: found.source })
  } catch (error) {
    console.error('Open access PDF fetch failed', error)
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
}
```

**Step 2: Vérifier l'import de Prisma**

Run: `grep -rn "from '@/lib/prisma'" app/api | head -3`
Expected: au moins une route existante importe `prisma` sous ce chemin. Si l'export s'appelle autrement (`db`, default), aligne l'import sur ce que fait le reste du dossier `app/api/` — **ne devine pas**.

**Step 3: Vérifier que ça compile**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

**Step 4: Commit**

```bash
git add app/api/publications/fetch-open-access-pdf/route.ts
git commit -m "feat(publications): api route fetching an open access pdf into R2"
```

---

## Task 4: Traductions

**Files:**
- Modify: `messages/en.json` (bloc `publications.editor.pdf`)
- Modify: `messages/fr.json` (même bloc)

**Step 1: Ajouter les clés en anglais**

Dans `messages/en.json`, sous `publications.editor.pdf`, ajouter :

```json
"fetchOnline": "Search for the PDF online",
"fetching": "Searching…",
"fetched": "PDF found and attached",
"fetchNotFound": "No open access version found for this article.",
"fetchFailed": "The search failed. Please try again."
```

**Step 2: Ajouter les mêmes clés en français**

Dans `messages/fr.json`, au même endroit :

```json
"fetchOnline": "Chercher le PDF en ligne",
"fetching": "Recherche en cours…",
"fetched": "PDF trouvé et attaché",
"fetchNotFound": "Aucune version en accès libre n'a été trouvée pour cet article.",
"fetchFailed": "La recherche a échoué. Réessayez."
```

**Step 3: Vérifier que les deux fichiers restent du JSON valide et symétriques**

Run:
```bash
node -e "
const en=require('./messages/en.json').publications.editor.pdf;
const fr=require('./messages/fr.json').publications.editor.pdf;
const missing=Object.keys(en).filter(k=>!(k in fr)).concat(Object.keys(fr).filter(k=>!(k in en)));
console.log(missing.length?'MISSING: '+missing.join(', '):'OK — '+Object.keys(en).length+' keys both sides');
"
```
Expected: `OK — 18 keys both sides`

**Step 4: Commit**

```bash
git add messages/en.json messages/fr.json
git commit -m "chore(i18n): messages for the open access pdf search"
```

---

## Task 5: Interface — le bouton dans la carte PDF

**Files:**
- Modify: `app/[locale]/publications/components/editor/editor-pdf.tsx`
- Modify: `app/[locale]/publications/components/article/article-page.tsx:216`

Le composant passerait à 6 props → au-dessus de la limite du projet (5). On regroupe donc en un objet `article`.

Le bouton s'appuie sur les valeurs **enregistrées** (`article.status`, `article.doi`, `article.pubmedId`), pas sur celles du formulaire en cours d'édition : la route relit la base, donc un DOI saisi mais pas encore sauvegardé ne servirait à rien.

**Step 1: Changer la signature du composant**

Remplacer la ligne 14 de `editor-pdf.tsx` :

```ts
export type EditorPdfArticle = {
  id: string
  pdfUrl: string | null
  status: string
  doi: string | null
  pubmedId: string | null
}

export function EditorPdf({ article, editable }: { article: EditorPdfArticle; editable: boolean }) {
  const { id: articleId, pdfUrl } = article
```

Le reste du corps utilise déjà `articleId` et `pdfUrl` : la déstructuration évite d'y toucher.

**Step 2: Ajouter la logique de recherche**

Après le `const remove = useAction(...)` (ligne 39), ajouter :

```ts
  const [searching, setSearching] = useState(false)

  const canSearchOnline =
    !pdfUrl &&
    (article.status === 'ACCEPTED' || article.status === 'PUBLISHED') &&
    Boolean(article.doi || article.pubmedId)

  async function onSearchOnline() {
    setSearching(true)
    try {
      const response = await fetch('/api/publications/fetch-open-access-pdf', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ articleId }),
      })
      if (response.status === 404) {
        toast.error(t('fetchNotFound'))
        return
      }
      if (!response.ok) throw new Error('fetch_failed')
      const found = (await response.json()) as { url: string; key: string }
      save.execute({ id: articleId, url: found.url, key: found.key })
    } catch {
      toast.error(t('fetchFailed'))
    } finally {
      setSearching(false)
    }
  }
```

Puis inclure `searching` dans `busy` (ligne 70) :

```ts
  const busy = uploading || searching || save.isExecuting || remove.isExecuting
```

**Step 3: Afficher le bouton**

Dans la branche « pas de PDF » (le bloc `) : editable ? (` ligne 117), envelopper le bouton de téléversement existant dans un fragment et ajouter dessous :

```tsx
        ) : editable ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-coral-200 bg-coral-50/40 px-4 py-8 text-center transition hover:bg-coral-50 disabled:opacity-50 dark:border-coral-500/30 dark:bg-coral-500/[0.05]"
            >
              <Upload className="h-5 w-5 text-coral-600" strokeWidth={2.2} />
              <span className="text-sm font-bold text-text-primary">{uploading ? t('uploading') : t('select')}</span>
              <span className="text-xs text-text-secondary">{t('hint')}</span>
            </button>
            {canSearchOnline && (
              <button
                type="button"
                disabled={busy}
                onClick={onSearchOnline}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-text-secondary transition hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/5"
              >
                <Search className="h-3.5 w-3.5" strokeWidth={2.2} />
                {searching ? t('fetching') : t('fetchOnline')}
              </button>
            )}
          </div>
        ) : (
```

Ajouter `Search` à l'import `lucide-react` de la ligne 8.

**Step 4: Le toast de succès**

`save.onSuccess` affiche `t('saved')` (« PDF attached »), ce qui convient aux deux chemins. Ne pas le dupliquer.

**Step 5: Mettre à jour l'appelant**

Dans `article-page.tsx`, remplacer la ligne 216 :

```tsx
            <EditorPdf
              article={{
                id: article.id,
                pdfUrl: article.pdfUrl,
                status: article.status,
                doi: article.doi,
                pubmedId: article.pubmedId,
              }}
              editable={visibility.cardsEditable}
            />
```

**Step 6: Vérifier la compilation et le lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

**Step 7: Commit**

```bash
git add "app/[locale]/publications/components/editor/editor-pdf.tsx" "app/[locale]/publications/components/article/article-page.tsx"
git commit -m "feat(publications): search an open access PDF from the article page"
```

---

## Task 6: Fixtures et test E2E

**Files:**
- Create: `tests/e2e/fixtures/open-access/resolutions.json`
- Create: `tests/e2e/fixtures/open-access/sample.pdf`
- Modify: `playwright.config.ts:91` (bloc `webServer.env`)
- Modify: `prisma/seed.test.ts:328` (article PUBLISHED)
- Create: `tests/e2e/publications-open-access-pdf.spec.ts`

**Step 1: Créer le PDF de fixture**

Le service de fixtures renvoie une **URL** ; il faut donc que cette URL soit servie localement pendant le test. Le plus simple : déposer le PDF dans `public/` sous un nom réservé aux tests et pointer la fixture dessus.

```bash
mkdir -p tests/e2e/fixtures/open-access
printf '%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' > public/test-open-access-sample.pdf
head -c 4 public/test-open-access-sample.pdf   # doit afficher %PDF
```

**Step 2: Créer la table de résolution**

`tests/e2e/fixtures/open-access/resolutions.json` — la clé est le PMID ou le DOI de l'article, la valeur ce que le service renvoie :

```json
{
  "34512303": { "url": "http://localhost:3100/test-open-access-sample.pdf", "source": "europepmc" }
}
```

⚠️ Le port doit correspondre à celui du serveur Playwright. `test:push` utilise `PLAYWRIGHT_PORT=3100`, le mode par défaut `3000`. Rendre l'URL relative n'est pas possible (le `fetch` est côté serveur), donc la fixture doit être **générée** avec le bon port. Remplacer le fichier statique par une variable d'environnement supplémentaire dans `playwright.config.ts` :

```ts
      OPEN_ACCESS_FIXTURE_DIR: path.resolve(__dirname, 'tests/e2e/fixtures/open-access'),
      OPEN_ACCESS_FIXTURE_ORIGIN: `http://localhost:${playwrightPort}`,
```

et écrire la fixture avec un marqueur :

```json
{
  "34512303": { "url": "{origin}/test-open-access-sample.pdf", "source": "europepmc" }
}
```

Dans `readFixture` (Task 2), remplacer le marqueur avant de renvoyer :

```ts
  for (const key of keys) {
    const found = resolutions[key]
    if (found) {
      return { ...found, url: found.url.replace('{origin}', process.env.OPEN_ACCESS_FIXTURE_ORIGIN ?? '') }
    }
  }
```

Ajouter au passage un cas de test unitaire dans `lib/services/publications/open-access-pdf.test.ts` couvrant ce remplacement (fixture dir + origin stubés, `readFile` simulé avec `vi.mock('node:fs/promises')`).

**Step 3: Donner un PMID à l'article publié du seed**

Dans `prisma/seed.test.ts`, l'article `'Personal cohort study from a previous laboratory'` (ligne ~328) : ajouter `pubmedId: '34512303'` à côté de `status: 'PUBLISHED'`.

Run: `npm run test:seed`
Expected: `✅ Created publications sample data`, sans erreur.

**Step 4: Écrire le test E2E**

Un seul parcours complet, les deux langues dans le même test — convention du projet.

```ts
import { test, expect, type Page } from '@playwright/test'

test.setTimeout(90000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('an admin fetches the open access PDF of a published article', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')

  await page.goto('/en/publications/admin', { timeout: 60000 })
  const publishedLink = page.getByRole('link', { name: /Personal cohort study from a previous laboratory/i })
  await expect(publishedLink).toBeVisible({ timeout: 30000 })
  await Promise.all([
    page.waitForURL(/\/en\/publications\/admin\/articles\/[^/]+$/, { timeout: 30000 }),
    publishedLink.click(),
  ])
  const articleUrl = page.url()

  await page.getByRole('button', { name: 'Edit' }).click()

  const searchButton = page.getByRole('button', { name: 'Search for the PDF online' })
  await expect(searchButton).toBeVisible({ timeout: 30000 })
  await searchButton.click()

  await expect(page.getByText('PDF attached')).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('link', { name: /Open the PDF/i })).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('button', { name: 'Search for the PDF online' })).toHaveCount(0)

  // Le même écran en français, une fois le PDF attaché
  await page.goto(articleUrl.replace('/en/', '/fr/'), { timeout: 60000 })
  await expect(page.getByRole('link', { name: /Ouvrir le PDF/i })).toBeVisible({ timeout: 30000 })

  // Un article en cours de rédaction n'a pas le bouton : rien à aller chercher
  await page.goto('/en/publications/admin', { timeout: 60000 })
  const underReviewLink = page.getByRole('link', { name: /Outcomes of multi-valve intervention/i })
  await underReviewLink.click()
  await page.waitForURL(/\/en\/publications\/admin\/articles\/[^/]+$/, { timeout: 30000 })
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('button', { name: 'Search for the PDF online' })).toHaveCount(0)
})
```

⚠️ Le libellé français exact du lien « Ouvrir le PDF » doit être lu dans `messages/fr.json` (`publications.editor.pdf.open`) — l'adapter si la traduction diffère.

**Step 5: Faire tourner le test**

Run: `npm run test:seed && npx playwright test tests/e2e/publications-open-access-pdf.spec.ts`
Expected: 1 passed.

Si le test échoue sur le téléchargement, vérifier dans les logs du serveur que la fixture a bien été lue et que l'URL contient le bon port.

**Step 6: Commit**

```bash
git add tests/e2e/fixtures/open-access public/test-open-access-sample.pdf playwright.config.ts prisma/seed.test.ts tests/e2e/publications-open-access-pdf.spec.ts lib/services/publications/open-access-pdf.ts lib/services/publications/open-access-pdf.test.ts
git commit -m "test(publications): e2e coverage for the open access pdf search"
```

---

## Task 7: Configuration et mise en production

**Files:**
- Modify: `.env` (local), `.env.test`
- Vercel: variable d'environnement de production

**Step 1: Définir l'adresse de contact en local**

Ajouter à `.env` :

```
OPEN_ACCESS_CONTACT_EMAIL=<une adresse réelle du labo>
```

**Step 2: Vérifier Unpaywall en conditions réelles**

C'est la seule partie du design qui n'a pas pu être testée pendant la conception : l'API refuse les adresses factices.

```bash
curl -sS "https://api.unpaywall.org/v2/10.3389/fnagi.2021.686506?email=$OPEN_ACCESS_CONTACT_EMAIL" | head -c 400
```
Expected: un JSON avec `"is_oa": true` et un `best_oa_location.url_for_pdf`. Si la réponse est `422`, l'adresse n'est pas acceptée — en essayer une autre avant d'aller plus loin.

**Step 3: Ajouter la variable sur Vercel**

```bash
vercel env add OPEN_ACCESS_CONTACT_EMAIL production
```
Puis vérifier : `vercel env ls | grep OPEN_ACCESS`

**Step 4: Validation complète**

Run: `npm run verify:push`
Expected: tout vert. En cas d'échec, corriger la cause — ne jamais affaiblir un test, ne jamais utiliser `--no-verify`.

**Step 5: Pousser**

```bash
git status                      # vérifier qu'on est bien sur main et que rien d'étranger n'est en attente
git push origin main
```

**Step 6: Vérifier le déploiement**

Run: `vercel ls`
Expected: le dernier déploiement en `Ready`. Sinon : `vercel inspect <url> --logs` et la skill `probleme-deploiement`.

---

## Vérification finale

- [ ] `npm run test:unit` — les deux nouveaux fichiers de test passent
- [ ] `npx tsc --noEmit` — pas d'erreur de typage, aucun `any`
- [ ] `npm run test:e2e tests/e2e/publications-open-access-pdf.spec.ts` — 1 passed
- [ ] `npm run verify:push` — vert de bout en bout
- [ ] Sur un article publié réel avec un PMID déposé dans PMC, le bouton ramène bien un PDF lisible
- [ ] Sur un article publié dans une revue fermée, le message « aucune version en accès libre » s'affiche et rien n'est attaché
