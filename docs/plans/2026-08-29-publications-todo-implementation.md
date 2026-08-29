# Publications — les huit demandes : plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Livrer les huit demandes remontées à l'usage de l'app Publications : filtres persistants, traçabilité des emails, banque auteurs complétée, signalement d'erreur, post LinkedIn.

**Architecture:** Cinq lots indépendants. Toute la logique décidable se place dans des modules purs de `lib/` testés à l'unité ; les composants React ne portent que du rendu et des appels d'action. Les mutations passent par `next-safe-action`. Trois migrations Prisma arrivent : journal des emails, candidats d'adresses, généralisation des demandes.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Prisma/PostgreSQL, next-safe-action, next-intl (fr/en), shadcn/ui, Tailwind v4, Vitest (unitaires), Playwright (E2E), Resend (emails).

**Design de référence:** `docs/plans/2026-08-29-publications-todo-design.md`

---

## Règles valables pour toutes les tâches

- **TDD.** Le test d'abord, on le fait échouer, puis le code minimal, puis on le fait passer.
- **Commit à chaque tâche terminée.** Jamais de fichier source créé et non commité : il passe le build local et casse le build Vercel, qui clone depuis le dépôt.
- **Aucun commentaire dans le code.** Le raisonnement va dans le message de commit.
- **Pas de `any`, pas de `useEffect`, pas de classe.** Les types viennent de `schema.prisma` ou de `@/types/`.
- **Tout texte visible est traduit** dans `messages/fr.json` **et** `messages/en.json`.
- Commande des tests unitaires : `npm run test:unit`
- Commande d'un test E2E ciblé : `PLAYWRIGHT_PORT=3100 npm run test:e2e tests/e2e/<fichier>.spec.ts`
- **Chaque migration doit aussi être appliquée à `testdb`**, sinon la validation complète échoue en E2E.

---

## Tâche 0 : solder la dette de branche

**Rien ne commence avant.** `worktree-publications-logbook` porte seize commits jamais mergés, dont
`65b5c6c refactor(publications): stop using the em dash as a business marker` qui touche
`lib/services/publications/articles.ts`, `studies.ts`, `messages/*.json` et `lib/prisma.ts` — tous
repris par ce plan.

**Étape 1 : vérifier ce qui reste dehors**

```bash
git log --oneline main..worktree-publications-logbook
git diff --stat main...worktree-publications-logbook
```

**Étape 2 : merger et pousser**

```bash
git checkout main
git merge worktree-publications-logbook
FULL_PUSH_VALIDATION=1 git push
```

Attendu : la validation complète passe, `main` avance de seize commits.

**Étape 3 : appliquer la migration du logbook à la base de test**

```bash
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
```

**Étape 4 : nettoyer le worktree**

```bash
git worktree remove .claude/worktrees/publications-logbook
git branch -d worktree-publications-logbook
```

---

# LOT 1 — Correctifs immédiats

Sans risque, se pousse seul. Aucune migration.

---

### Tâche 1 : sérialiser les filtres du tableau de bord

Le module pur qui convertit les filtres en paramètres d'URL et inversement. Aucun composant
React ne bouge dans cette tâche.

**Files:**
- Create: `lib/publications/dashboard-filter-params.ts`
- Test: `lib/publications/dashboard-filter-params.test.ts`
- Read first: `lib/publications/admin-dashboard.ts:33-62` (le type `DashboardFilters` et ses valeurs par défaut)

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_DASHBOARD_FILTERS, type DashboardFilters } from './admin-dashboard'
import { filtersToSearchParams, filtersFromSearchParams } from './dashboard-filter-params'

describe('dashboard filter params', () => {
  it('writes nothing when the filters are the default ones', () => {
    expect(filtersToSearchParams(DEFAULT_DASHBOARD_FILTERS).toString()).toBe('')
  })

  it('round-trips a fully populated filter set', () => {
    const filters: DashboardFilters = {
      studies: ['study-1', 'none'],
      journals: ['Circulation'],
      statuses: ['UNDER_REVIEW', 'ACCEPTED'],
      types: ['ORIGINAL'],
      scopes: ['LARIB_TEAM', 'EXTERNAL'],
      yearFrom: '2020',
      yearTo: '2026',
      author: 'author-7',
      authorPosition: 'first',
      query: 'valve mitrale',
      pendingOverMonth: true,
    }
    const restored = filtersFromSearchParams(new URLSearchParams(filtersToSearchParams(filters).toString()))
    expect(restored).toEqual(filters)
  })

  it('falls back to the defaults on an unknown or malformed parameter', () => {
    const params = new URLSearchParams('statuses=NOT_A_STATUS&yearFrom=hier&pendingOverMonth=peut-etre')
    expect(filtersFromSearchParams(params)).toEqual(DEFAULT_DASHBOARD_FILTERS)
  })

  it('keeps a filter equal to the default out of the URL', () => {
    const params = filtersToSearchParams({ ...DEFAULT_DASHBOARD_FILTERS, query: 'aorte' })
    expect(params.toString()).toBe('query=aorte')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- dashboard-filter-params`
Expected: FAIL, `Failed to resolve import "./dashboard-filter-params"`

**Step 3: Write the implementation**

`lib/publications/dashboard-filter-params.ts` :

- une liste de descripteurs, un par champ de `DashboardFilters`, portant son nom de paramètre,
  sa lecture et son écriture ;
- les listes se sérialisent en valeurs séparées par des virgules ;
- `pendingOverMonth` s'écrit `1` et se lit comme vrai uniquement sur `'1'` ;
- toute valeur illisible retombe sur `DEFAULT_DASHBOARD_FILTERS[champ]` ;
- les statuts, types et scopes sont validés contre `ARTICLE_STATUS_VALUES`, `ARTICLE_TYPES` et
  `ARTICLE_SCOPES` ; une valeur inconnue est ignorée, et une liste vidée retombe sur la valeur
  par défaut ;
- un champ égal à sa valeur par défaut n'est pas écrit.

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- dashboard-filter-params`
Expected: PASS, 4 tests

**Step 5: Commit**

```bash
git add lib/publications/dashboard-filter-params.ts lib/publications/dashboard-filter-params.test.ts
git commit -m "feat(publications): read the dashboard filters from the address bar"
```

---

### Tâche 2 : brancher le tableau de bord sur l'URL

**Files:**
- Create: `app/[locale]/publications/components/admin-dashboard/use-url-filters.ts`
- Modify: `app/[locale]/publications/components/admin-dashboard/dashboard-view.tsx:54` et `:84-86`

**Step 1: Écrire le hook**

`use-url-filters.ts` expose :

```ts
export function useUrlDashboardFilters(): {
  filters: DashboardFilters
  updateFilter: (patch: Partial<DashboardFilters>) => void
  clearFilters: () => void
}
```

Il lit `useSearchParams()` et dérive `filters` par `filtersFromSearchParams` — **pas de `useState`
miroir**, l'URL est l'unique source. `updateFilter` recompose les filtres, les sérialise et
appelle `router.replace(\`${pathname}?${params}\`, { scroll: false })`.

`replace` et non `push` : la frappe dans le champ de recherche n'empile pas d'entrées
d'historique, et l'ouverture d'une publication reste la seule entrée sur laquelle le bouton
précédent revient.

**Step 2: Brancher le composant**

Dans `dashboard-view.tsx`, remplacer

```tsx
const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS)
```

par

```tsx
const { filters, updateFilter, clearFilters } = useUrlDashboardFilters()
```

et supprimer la fonction locale `updateFilter` (lignes 84-86). Le bouton « tout effacer » appelle
`clearFilters`. `overviewOpen` reste un `useState`, ce n'est pas un filtre.

**Step 3: Envelopper la page dans un Suspense**

`useSearchParams` impose une frontière de suspense. Dans
`app/[locale]/publications/admin/page.tsx`, entourer `<DashboardView …/>` d'un
`<Suspense fallback={null}>`.

**Step 4: Vérifier**

```bash
npm run typecheck && npm run test:unit
```

Puis à la main : filtrer, ouvrir une publication, revenir — les filtres sont là, et l'adresse
porte les paramètres.

**Step 5: Commit**

```bash
git add app/\[locale\]/publications/components/admin-dashboard/use-url-filters.ts \
        app/\[locale\]/publications/components/admin-dashboard/dashboard-view.tsx \
        app/\[locale\]/publications/admin/page.tsx
git commit -m "feat(publications): keep the dashboard filters through a round trip"
```

---

### Tâche 3 : même traitement pour la banque auteurs et la page communication

**Files:**
- Modify: `app/[locale]/publications/components/authors-manager.tsx:104` et suivantes
- Modify: `app/[locale]/publications/components/communication/communication-view.tsx:40-42`
- Create: `lib/publications/authors-filter-params.ts` + son test
- Create: `lib/publications/communication-params.ts` + son test

Même forme que les tâches 1 et 2, sur des états plus petits :

- banque auteurs : `query`, `typeFilter`, `centreFilter`, `portalFilter`, plus la clé et le sens
  de tri ;
- communication : `tab`, `query`, plus la clé et le sens de tri.

Écrire d'abord le test d'aller-retour de chaque module pur, puis brancher.

**Commit**

```bash
git commit -m "feat(publications): keep the author bank and communication filters in the address"
```

---

### Tâche 4 : le bouton de demande de liste d'auteurs sort du mode édition

**Files:**
- Modify: `app/[locale]/publications/components/editor/editor-authors.tsx:140-150`
- Modify: `messages/fr.json`, `messages/en.json`

**Step 1: Sortir le bouton du garde `editable`**

Le bloc `{editable && (<button …>)}` des lignes 140-150 devient inconditionnel : le bouton
s'affiche que la carte soit en lecture ou en édition. Le champ `contributorsNote`, lui, **reste**
sous `editable` — c'est un champ de formulaire.

Conséquence à traiter : en lecture, `form.getValues('contributorsNote')` renvoie la valeur
persistée, ce qui reste le bon contenu à joindre à la demande. Aucun changement d'action.

**Step 2: Ajouter la phrase d'explication**

Sous le bouton, une phrase courte disant ce que la demande déclenche : un mail aux admins
Publications. Nouvelle clé `publications.editor.requestAuthorListHint`, traduite dans les deux
langues.

- fr : « Les admins Publications reçoivent un mail et complètent la liste. »
- en : « The Publications admins get an email and complete the list. »

**Step 3: Vérifier**

`npm run typecheck` puis, à la main, ouvrir une publication dont on est premier auteur **sans**
cliquer sur Éditer : le bouton est visible.

**Step 4: Commit**

```bash
git commit -m "feat(publications): ask for the author list without entering edit mode"
```

---

### Tâche 5 : « Cardio Larib » devient « Larib Portal »

**Files:**
- Modify: `lib/email/layout.ts:25` (titre du document), `:36` (texte alternatif du logo), `:53` (pied de page)
- Modify: `lib/email/welcome-template.ts:17,22-23,38-39`
- Test: `lib/services/email.test.ts`

**Step 1: Write the failing test**

Ajouter dans `lib/services/email.test.ts` :

```ts
describe('portal branding', () => {
  it('never signs an email as Cardio Larib', () => {
    const html = renderCarouselRequestEmailHtml('Bonjour Alice,\n\nFélicitations !')
    expect(html).not.toContain('Cardio Larib')
    expect(html).toContain('Larib Portal')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- email`
Expected: FAIL, le HTML contient encore « Cardio Larib »

**Step 3: Remplacer**

Les cinq occurrences ci-dessus. Le fichier de layout étant partagé par les mails congés,
invitation et bienvenue, relire les tests de ces mails avant de conclure.

**Step 4: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS. Toute assertion qui attendait « Cardio Larib » se met à jour — c'est un
changement voulu, pas un test à affaiblir.

**Step 5: Commit**

```bash
git commit -m "refactor(email): sign every portal email as Larib Portal"
```

---

### Tâche 6 : le mail com se met en gras et se déclare automatique

**Files:**
- Modify: `lib/services/email.ts:738-753` (`renderCarouselRequestEmailHtml`)
- Test: `lib/services/email.test.ts`

**Step 1: Write the failing test**

```ts
describe('renderCarouselRequestEmailHtml', () => {
  it('bolds whatever sits between French quotes', () => {
    const html = renderCarouselRequestEmailHtml(
      'Bonjour Alice,\n\nFélicitations pour l’acceptation de ton article « Mitral valve repair » dans Circulation !',
    )
    expect(html).toContain('<strong>« Mitral valve repair »</strong>')
  })

  it('says the email is automatic', () => {
    const html = renderCarouselRequestEmailHtml('Bonjour Alice,\n\nFélicitations !')
    expect(html).toContain('email automatique')
  })

  it('leaves a body without quotes untouched', () => {
    const html = renderCarouselRequestEmailHtml('Bonjour Alice,\n\nFélicitations !')
    expect(html).not.toContain('<strong>')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- email`
Expected: FAIL sur les deux premiers tests

**Step 3: Implémenter**

Dans le rendu d'un paragraphe, après échappement, remplacer chaque segment `« … »` par le même
segment enveloppé de `<strong>`. La règle porte sur la forme et non sur le titre transmis : le
corps reste éditable sans casser la mise en forme.

Le pied de page (`footerNote`) reçoit en plus : « Ceci est un email automatique envoyé depuis
Larib Portal. »

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- email`
Expected: PASS

**Step 5: Commit**

```bash
git commit -m "feat(publications): bold the paper title and flag the mail as automatic"
```

---

### Tâche 7 : pousser le lot 1

```bash
FULL_PUSH_VALIDATION=1 git push
```

Attendu : build + suite E2E complète au vert. Le lot 1 est en production.

---

# LOT 2 — Traçabilité des emails

Une migration. Ce lot sert de socle au lot 4.

---

### Tâche 8 : extraire le rendu du mail com dans un module pur

Cause de l'écart aperçu / envoi : la fonction de rendu vit dans `lib/services/email.ts`, un module
serveur que la popup ne peut pas appeler. On la déplace, sans changer son comportement.

**Files:**
- Create: `lib/email/carousel-template.ts`
- Modify: `lib/services/email.ts` (supprimer `renderCarouselRequestEmailHtml`, l'importer)
- Modify: `lib/services/email.test.ts` (l'import change de chemin)
- Create: `lib/email/carousel-template.test.ts` (y déplacer les tests des tâches 5 et 6)

**Step 1: Déplacer**

Le nouveau module n'importe que `lib/email/layout.ts` et `lib/publications/carousel-email.ts` —
aucune dépendance serveur, aucun accès réseau, aucun `process.env`. Il doit être importable depuis
un composant client.

**Step 2: Vérifier qu'aucun comportement ne bouge**

Run: `npm run test:unit -- email carousel-template`
Expected: PASS, les mêmes assertions qu'avant le déplacement

**Step 3: Commit**

```bash
git commit -m "refactor(email): make the carousel template renderable on both sides"
```

---

### Tâche 9 : la popup montre l'email réel

**Files:**
- Modify: `app/[locale]/publications/components/article/carousel-email-dialog.tsx`
- Modify: `messages/fr.json`, `messages/en.json`

**Step 1: Deux onglets**

La popup gagne un `Tabs` shadcn : **Rédiger** (les champs actuels) et **Aperçu**.

**Step 2: L'aperçu**

```tsx
<iframe
  title={t('previewTitle')}
  sandbox=""
  srcDoc={renderCarouselRequestEmailHtml(draft.body, draft.subject)}
  className="h-[520px] w-full rounded-xl border border-line bg-white"
/>
```

`sandbox=""` désactive scripts, formulaires et navigation. Le contenu est déjà échappé par le
gabarit ; le bac à sable ferme la question.

L'aperçu se recalcule à chaque frappe : c'est une fonction pure, aucun appel serveur.

**Step 3: Nouvelles clés de traduction**

`publications.carouselEmail.tabCompose`, `.tabPreview`, `.previewTitle`, dans les deux langues.

**Step 4: Vérifier**

`npm run typecheck`, puis à la main : modifier le corps, passer sur Aperçu, constater que le gras
et le pied de page apparaissent bien.

**Step 5: Commit**

```bash
git commit -m "feat(publications): preview the carousel mail exactly as it will be sent"
```

---

### Tâche 10 : la table du journal des emails

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_publication_email_log/migration.sql`

**Step 1: Ajouter le modèle**

```prisma
enum PublicationEmailKind {
  CAROUSEL_REQUEST
  AUTHOR_LIST_REQUEST
  MONTHLY_RECAP
  ISSUE_REPORT
}

enum PublicationEmailStatus {
  SENT
  FAILED
}

model PublicationEmail {
  id         String                 @id @default(cuid())
  kind       PublicationEmailKind
  articleId  String?
  article    Article?               @relation(fields: [articleId], references: [id], onDelete: SetNull)
  toEmails   String[]
  ccEmails   String[]               @default([])
  subject    String
  bodyText   String
  bodyHtml   String?
  status     PublicationEmailStatus @default(SENT)
  error      String?
  providerId String?
  sentById   String?
  sentBy     User?                  @relation("PublicationEmailSentBy", fields: [sentById], references: [id], onDelete: SetNull)
  sentAt     DateTime               @default(now())

  @@index([kind, sentAt])
  @@index([articleId])
  @@map("PublicationEmail")
}
```

Ajouter les relations inverses sur `Article` (`emailsSent PublicationEmail[]`) et sur `User`
(`publicationEmailsSent PublicationEmail[] @relation("PublicationEmailSentBy")`).

**Step 2: Générer la migration**

```bash
npx prisma migrate dev --name publication_email_log
```

**Step 3: Appliquer à la base de test**

```bash
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
```

**Step 4: Redémarrer le serveur de dev**

Après une migration qui ajoute un champ, le client Prisma en mémoire est périmé et les écritures
échouent. `npm run dev` doit être relancé.

**Step 5: Commit**

```bash
git commit -m "feat(publications): add the table that records every mail sent"
```

---

### Tâche 11 : enregistrer chaque envoi

**Files:**
- Create: `lib/services/publications/email-log.ts`
- Test: `lib/publications/email-log-entry.test.ts`
- Create: `lib/publications/email-log-entry.ts`
- Modify: `app/[locale]/publications/actions.ts:836-858` (`sendCarouselEmailAction`)
- Modify: `lib/services/publications/author-requests.ts:41-46`
- Modify: `app/api/cron/publications-recap/route.ts:33-47`

**Step 1: Le module pur**

`lib/publications/email-log-entry.ts` transforme un résultat d'envoi en ligne de journal :

```ts
export type EmailSendResult = { id: string } | { error: string }

export function emailLogEntryFrom(result: EmailSendResult): {
  status: 'SENT' | 'FAILED'
  providerId: string | null
  error: string | null
}
```

**Step 2: Write the failing test**

```ts
describe('emailLogEntryFrom', () => {
  it('records a success with its provider id', () => {
    expect(emailLogEntryFrom({ id: 're_123' })).toEqual({ status: 'SENT', providerId: 're_123', error: null })
  })

  it('records a failure with its reason', () => {
    expect(emailLogEntryFrom({ error: 'RESEND_REQUEST_FAILED_422' })).toEqual({
      status: 'FAILED', providerId: null, error: 'RESEND_REQUEST_FAILED_422',
    })
  })
})
```

Run: `npm run test:unit -- email-log-entry` → FAIL, puis implémenter, puis PASS.

**Step 3: Le point de passage unique**

`lib/services/publications/email-log.ts` :

```ts
export async function recordPublicationEmail(params: {
  kind: PublicationEmailKind
  articleId?: string | null
  to: string[]
  cc?: string[]
  subject: string
  bodyText: string
  bodyHtml?: string | null
  sentById?: string | null
  result: EmailSendResult
}): Promise<void>
```

**Step 4: Brancher les trois expéditeurs**

- `sendCarouselEmailAction` : `kind: 'CAROUSEL_REQUEST'`, `articleId`, `sentById: ctx.userId`.
  **`markCarouselEmailSent` ne s'exécute que si l'envoi a réussi** — c'est déjà le cas, ne pas le
  casser ; mais la ligne de journal, elle, s'écrit dans les deux cas.
- `createAuthorListRequest` : `kind: 'AUTHOR_LIST_REQUEST'`, `sentById: userId`.
- Le cron du récap : `kind: 'MONTHLY_RECAP'`, `sentById: null`, une ligne par destinataire.

Le récap ne renvoie aujourd'hui que `{ id }` ou `{ error }` : le format attendu, rien à changer
côté expéditeur.

**Step 5: Commit**

```bash
git commit -m "feat(publications): record every mail the app sends, failures included"
```

---

### Tâche 12 : la page admin « Emails »

**Files:**
- Create: `app/[locale]/publications/admin/emails/page.tsx`
- Create: `app/[locale]/publications/components/emails/email-log-view.tsx`
- Create: `app/[locale]/publications/components/emails/email-log-row.tsx`
- Create: `lib/publications/email-log-filters.ts` + son test
- Modify: `lib/services/publications/email-log.ts` (ajouter la lecture)
- Modify: `app/[locale]/publications/components/admin-dashboard/dashboard-modules.tsx` (la tuile d'accès)
- Modify: `messages/fr.json`, `messages/en.json`

**Step 1: Le module de filtrage, pur et testé**

`filterEmailLog(entries, { kind, from, to, recipient, query })`, sur le modèle de
`lib/publications/communication.ts`. Test unitaire d'abord : filtre par type, par période, par
destinataire partiel, recherche sur le sujet.

**Step 2: La lecture**

```ts
export async function listPublicationEmails(limit = 200): Promise<PublicationEmailItem[]>
```

Triée par `sentAt` décroissant, avec le titre de la publication et le nom de l'expéditeur.

**Step 3: La page**

Garde d'accès identique aux autres pages admin :

```tsx
const session = await requireAuth()
if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
```

Tableau : date, type, publication, destinataires, sujet, statut. Une ligne se déplie sur le
contenu exact envoyé, rendu dans la même `iframe sandbox=""` que l'aperçu de la tâche 9. Les
lignes en échec portent un badge rouge et leur message d'erreur.

**Step 4: L'accès**

Une tuile « Emails » dans `dashboard-modules.tsx`, à côté de Communication.

**Step 5: Commit**

```bash
git commit -m "feat(publications): browse what the app sent and when"
```

---

### Tâche 13 : le statut du mail com sur la fiche et dans la liste

**Files:**
- Modify: `app/[locale]/publications/components/communication/communication-card.tsx`
- Modify: `app/[locale]/publications/components/publications-table.tsx`
- Modify: `lib/services/publications/articles.ts` (remonter le dernier envoi de la publication)
- Modify: `messages/fr.json`, `messages/en.json`

**Step 1: La fiche**

La carte Communication affiche déjà la date. Elle gagne l'expéditeur et les destinataires réels,
lus dans le journal : « Envoyé le 12 août 2026 par Solenn Toupin à alice@exemple.fr ». Quand
plusieurs envois existent, le dernier s'affiche et un lien déplie les précédents.

**Step 2: La liste**

`DashboardArticleItem` porte déjà `carouselEmailSentAt` — rien à ajouter côté service. Dans
`publications-table.tsx`, une colonne enveloppe **uniquement** sur les publications dont le statut
est dans `COMMUNICATION_STATUSES` : pleine si envoyé (avec la date en infobulle), vide sinon.

**Step 3: Le filtre**

Ajouter `carouselPending: boolean` à `DashboardFilters` et à `DEFAULT_DASHBOARD_FILTERS` (valeur
`false`), le traiter dans `filterDashboardArticles`, l'ajouter au module de sérialisation de la
tâche 1 et **compléter son test d'aller-retour**.

**Step 4: Vérifier**

Run: `npm run test:unit`
Expected: PASS, dont le test d'aller-retour des filtres mis à jour

**Step 5: Commit**

```bash
git commit -m "feat(publications): show the carousel mail status where the work happens"
```

---

### Tâche 14 : le récap mensuel passe au même gabarit

**Files:**
- Modify: `lib/services/email.ts` (`renderPublicationsRecapEmail`)
- Test: `lib/services/email.test.ts`

**Step 1: Write the failing test**

```ts
it('signs the monthly recap as an automatic Larib Portal mail', () => {
  const { html } = renderPublicationsRecapEmail({ /* … */ })
  expect(html).not.toContain('Cardio Larib')
  expect(html).toContain('email automatique')
})
```

**Step 2 à 4:** faire échouer, appliquer les mêmes corrections que la tâche 6 (titres des
publications en gras, mention automatique), faire passer.

**Step 5: Commit**

```bash
git commit -m "feat(publications): align the monthly recap with the carousel template"
```

---

### Tâche 15 : pousser le lot 2

```bash
FULL_PUSH_VALIDATION=1 git push
```

Vérifier ensuite en production que la migration s'est appliquée pendant le build
(`postinstall` → `prisma migrate deploy`).

---

# LOT 3 — Banque auteurs

Une migration. Le lot le plus long, et le plus indépendant.

---

### Tâche 16 : afficher ce qui est déjà en base

`Author.email`, `Author.emails[]` et `Author.degrees` existent et sont saisissables. Ils ne sont
simplement jamais affichés dans le tableau.

**Files:**
- Modify: `app/[locale]/publications/components/authors-manager.tsx:82-97` (les clés de tri), `:333-345` (les colonnes), `:140-151` (le filtrage)
- Modify: `lib/services/publications/authors.ts` (remonter `email`, `emails`, `degrees` dans `AuthorListItem` s'ils n'y sont pas)
- Modify: `messages/fr.json`, `messages/en.json`

**Step 1: Deux colonnes**

`SortKey` gagne `'email'`. Deux `TableHead` : **Email** et **Titres**. La cellule email affiche
l'adresse principale, et une pastille d'alerte ambre quand l'auteur n'en a aucune. La cellule
titres affiche `degrees` — le retirer d'à côté du nom, où il fait aujourd'hui doublon.

**Step 2: Le filtre « sans email »**

Un quatrième sélecteur à côté des filtres existants : tous / avec email / sans email. Un auteur
est « avec email » s'il a `email` **ou** au moins une entrée dans `emails`.

**Step 3: La recherche porte aussi sur l'adresse**

Étendre le prédicat de recherche existant à `email` et `emails`.

**Step 4: Le filtre passe dans l'URL**

Compléter `lib/publications/authors-filter-params.ts` de la tâche 3 et son test.

**Step 5: Commit**

```bash
git commit -m "feat(publications): surface author emails and degrees in the bank"
```

---

### Tâche 17 : extraire une adresse d'une affiliation

PubMed écrit l'adresse du correspondant dans le texte de l'affiliation, sous la forme
« Electronic address: … ». Module pur, aucun accès base.

**Files:**
- Create: `lib/publications/affiliation-emails.ts`
- Test: `lib/publications/affiliation-emails.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { extractEmailsFromAffiliation } from './affiliation-emails'

describe('extractEmailsFromAffiliation', () => {
  it('reads the PubMed electronic address and drops the trailing dot', () => {
    expect(extractEmailsFromAffiliation(
      'Department of Cardiology, Lariboisiere Hospital, Paris, France. Electronic address: alice.martin@aphp.fr.',
    )).toEqual(['alice.martin@aphp.fr'])
  })

  it('reads a bare address without the PubMed marker', () => {
    expect(extractEmailsFromAffiliation('Inserm U942, Paris (bob@inserm.fr)')).toEqual(['bob@inserm.fr'])
  })

  it('returns every distinct address, lowercased', () => {
    expect(extractEmailsFromAffiliation('a@x.fr, A@X.FR; b@y.fr')).toEqual(['a@x.fr', 'b@y.fr'])
  })

  it('returns nothing on an affiliation without an address', () => {
    expect(extractEmailsFromAffiliation('Department of Cardiology, Paris, France.')).toEqual([])
  })

  it('ignores a DOI or an identifier that is not an address', () => {
    expect(extractEmailsFromAffiliation('ORCID 0000-0002-1825-0097, doi:10.1000/182')).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- affiliation-emails`
Expected: FAIL, module introuvable

**Step 3: Implémenter**

Une expression régulière d'adresse, un point final retiré s'il termine la capture, minuscules,
déduplication en préservant l'ordre.

**Step 4: PASS, Step 5: Commit**

```bash
git commit -m "feat(publications): pull an author address out of a raw affiliation"
```

---

### Tâche 18 : l'import PubMed garde toutes les affiliations

`lib/services/publications/pubmed-parse.ts:87` ne conserve que la **première** affiliation de
chaque auteur (`toArray(node.AffiliationInfo)[0]`). Des adresses sont perdues dès l'import.

**Files:**
- Modify: `lib/services/publications/pubmed-parse.ts:85-96`
- Test: `lib/services/publications/pubmed-parse.test.ts`

**Step 1: Write the failing test**

Un enregistrement PubMed dont un auteur porte deux `AffiliationInfo`, la seconde contenant
« Electronic address: … ». Attendu : les deux affiliations remontent.

**Step 2: Faire échouer, puis implémenter**

Le champ `affiliation: string | null` devient `affiliations: string[]`. Répercuter sur les
appelants (`import.ts`, `publication-lookup.ts`) : le premier élément garde le rôle de
l'ancien champ, la liste complète est stockée dans `AuthorAffiliation`.

**Step 3: Faire passer toute la suite**

Run: `npm run test:unit`
Expected: PASS. Les tests d'import existants qui attendaient `affiliation` se mettent à jour.

**Step 4: Commit**

```bash
git commit -m "fix(publications): stop dropping every affiliation but the first at import"
```

---

### Tâche 19 : la table des adresses candidates

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_author_email_candidate/migration.sql`

```prisma
enum AuthorEmailSource {
  AFFILIATION
  PUBMED
  PORTAL_USER
  IMPORT
}

enum AuthorEmailCandidateStatus {
  PENDING
  ACCEPTED
  REJECTED
}

model AuthorEmailCandidate {
  id        String                     @id @default(cuid())
  authorId  String
  author    Author                     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  email     String
  source    AuthorEmailSource
  context   String?
  articleId String?
  status    AuthorEmailCandidateStatus @default(PENDING)
  createdAt DateTime                   @default(now())
  updatedAt DateTime                   @updatedAt

  @@unique([authorId, email])
  @@index([status])
  @@map("AuthorEmailCandidate")
}
```

Relation inverse sur `Author` : `emailCandidates AuthorEmailCandidate[]`.

Puis `npx prisma migrate dev`, application à `testdb`, redémarrage de `npm run dev`, commit.

```bash
git commit -m "feat(publications): add the table holding author address candidates"
```

---

### Tâche 20 : le scan qui propose des adresses

**Files:**
- Create: `lib/publications/email-candidates.ts` (pur) + son test
- Create: `lib/services/publications/author-email-scan.ts`
- Modify: `app/[locale]/publications/actions.ts` (nouvelle action admin)

**Step 1: Le module pur**

```ts
export type CandidateProposal = {
  authorId: string
  email: string
  source: AuthorEmailSource
  context: string | null
  articleId: string | null
}

export function dedupeProposals(proposals: CandidateProposal[]): CandidateProposal[]

export function keepUnknownProposals(
  proposals: CandidateProposal[],
  known: { authorId: string; email: string }[],
): CandidateProposal[]
```

**Step 2: Write the failing test**

Couvrir : deux propositions identiques ne donnent qu'une ligne ; la source la plus fiable
l'emporte à adresse égale (ordre `PORTAL_USER` > `AFFILIATION` > `PUBMED` > `IMPORT`) ; une
adresse déjà portée par l'auteur ou déjà refusée n'est pas reproposée ; la comparaison est
insensible à la casse.

**Step 3: Le service**

`scanAuthorEmailCandidates()` assemble trois sources, dans cet ordre :

1. les adresses extraites de `AuthorAffiliation.raw` et des `Affiliation.raw` liées aux
   signatures de l'auteur, par `extractEmailsFromAffiliation` ;
2. les adresses des publications récentes rejouées depuis PubMed, désormais complètes grâce à la
   tâche 18 ;
3. l'adresse du compte du portail lié, quand `Author.userId` est renseigné.

Le résultat passe par `dedupeProposals` puis `keepUnknownProposals`, et s'écrit en `PENDING` par
`createMany` avec `skipDuplicates`.

**Step 4: L'action**

`scanAuthorEmailsAction`, en `appAdminAction('PUBLICATIONS')`, renvoie le nombre de propositions
créées.

**Step 5: Commit**

```bash
git commit -m "feat(publications): propose the addresses hiding in affiliations and accounts"
```

---

### Tâche 21 : l'écran de revue

**Files:**
- Create: `app/[locale]/publications/admin/authors/emails/page.tsx`
- Create: `app/[locale]/publications/components/authors/email-review-list.tsx`
- Modify: `app/[locale]/publications/actions.ts` (accepter / refuser)
- Modify: `messages/fr.json`, `messages/en.json`

**Step 1: Les deux actions**

- `acceptAuthorEmailCandidateAction` : passe le candidat en `ACCEPTED`, ajoute l'adresse à
  `Author.emails` si absente, et la place dans `Author.email` si ce champ est vide. Transaction.
- `rejectAuthorEmailCandidateAction` : passe en `REJECTED`. Un candidat refusé n'est jamais
  reproposé — c'est ce que teste `keepUnknownProposals`.

Les deux déclenchent un toast `sonner` sur succès comme sur erreur, et invalident le cache des
auteurs.

**Step 2: La page**

Propositions groupées par auteur. Pour chaque candidat : l'adresse, un badge de source, et
l'extrait d'affiliation dont elle sort (`context`), tronqué avec une infobulle. Deux boutons,
Accepter et Refuser. Un bouton « Relancer la recherche » appelle l'action de scan.

Garde d'accès admin identique aux autres pages.

**Step 3: Commit**

```bash
git commit -m "feat(publications): review each proposed address before it lands in the bank"
```

---

### Tâche 22 : importer les adresses de l'équipe

Les adresses des membres de l'équipe viennent de la boîte Gmail, **hors application**.
L'extraction est un travail à part ; l'app ne reçoit qu'un CSV.

**Files:**
- Create: `lib/publications/author-email-import.ts` (pur) + son test
- Modify: `app/[locale]/publications/components/authors/email-review-list.tsx` (zone de dépôt)
- Modify: `app/[locale]/publications/actions.ts` (action d'import)

**Step 1: Le module pur**

```ts
export function parseAuthorEmailCsv(content: string): { lastName: string; firstName: string; email: string }[]

export function matchImportedRows(
  rows: { lastName: string; firstName: string; email: string }[],
  authors: { id: string; firstName: string; lastName: string }[],
): { matched: CandidateProposal[]; unmatched: { lastName: string; firstName: string; email: string }[] }
```

**Step 2: Write the failing test**

Couvrir : séparateur point-virgule, en-tête optionnel, accents et casse ignorés au
rapprochement, un nom porté par deux auteurs reste **non rapproché** plutôt que rapproché au
hasard, une ligne sans adresse valide est rejetée.

**Step 3: Implémenter, puis l'action**

`importAuthorEmailsAction` crée des candidats de source `IMPORT` pour les lignes rapprochées et
renvoie les lignes non rapprochées, affichées telles quelles pour correction manuelle. Rien ne
s'écrit dans `Author` : tout passe par l'écran de revue.

**Step 4: Commit**

```bash
git commit -m "feat(publications): import team addresses as candidates to review"
```

---

### Tâche 23 : pousser le lot 3

```bash
FULL_PUSH_VALIDATION=1 git push
```

Puis, en production, lancer le scan une première fois depuis l'écran de revue et mesurer combien
d'auteurs restent sans adresse.

---

# LOT 4 — Signaler une erreur

Une migration, un renommage. Dépend du lot 2 pour le journal des emails.

---

### Tâche 24 : généraliser la demande de liste d'auteurs

`AuthorListRequest` fait déjà ce travail pour un seul cas, avec son circuit de résolution et sa
place dans le tableau de bord admin. On le généralise plutôt que de créer une seconde table.

**Files:**
- Modify: `prisma/schema.prisma` (modèle `AuthorListRequest`)
- Create: `prisma/migrations/<timestamp>_publication_request/migration.sql`
- Modify: `lib/services/publications/author-requests.ts` → renommer en `publication-requests.ts`
- Modify: `scripts/copy-publications-to-prod.ts`
- Modify: `app/[locale]/publications/components/admin-dashboard/dashboard-view.tsx`, `dashboard-modules.tsx`

**Step 1: Le modèle**

```prisma
enum PublicationRequestKind {
  AUTHOR_LIST
  ERROR_REPORT
}

model PublicationRequest {
  id            String                  @id @default(cuid())
  kind          PublicationRequestKind  @default(AUTHOR_LIST)
  articleId     String
  article       Article                 @relation(fields: [articleId], references: [id], onDelete: Cascade)
  requestedById String
  requestedBy   User                    @relation("PublicationRequestedBy", fields: [requestedById], references: [id], onDelete: Cascade)
  note          String?
  message       String?
  status        AuthorListRequestStatus @default(PENDING)
  createdAt     DateTime                @default(now())
  resolvedAt    DateTime?
  resolvedById  String?
  resolvedBy    User?                   @relation("PublicationRequestResolvedBy", fields: [resolvedById], references: [id], onDelete: SetNull)

  @@index([articleId, status])
  @@index([kind, status])
  @@map("PublicationRequest")
}
```

**Step 2: La migration**

`prisma migrate dev` produit un `DROP TABLE` / `CREATE TABLE` qui **perdrait les demandes
existantes**. Éditer le SQL à la main pour un renommage :

```sql
ALTER TABLE "AuthorListRequest" RENAME TO "PublicationRequest";
CREATE TYPE "PublicationRequestKind" AS ENUM ('AUTHOR_LIST', 'ERROR_REPORT');
ALTER TABLE "PublicationRequest" ADD COLUMN "kind" "PublicationRequestKind" NOT NULL DEFAULT 'AUTHOR_LIST';
ALTER TABLE "PublicationRequest" ADD COLUMN "message" TEXT;
CREATE INDEX "PublicationRequest_kind_status_idx" ON "PublicationRequest"("kind", "status");
```

Vérifier ensuite que `prisma migrate dev` ne propose plus rien : le schéma et la base coïncident.

**Step 3: Répercuter le renommage**

`prisma.authorListRequest` devient `prisma.publicationRequest` partout. `npm run typecheck` liste
exhaustivement les points à reprendre.

**Step 4: Appliquer à la base de test, commit**

```bash
git commit -m "refactor(publications): turn the author-list request into a general request"
```

---

### Tâche 25 : à qui part un signalement

**Files:**
- Create: `lib/publications/issue-recipients.ts`
- Test: `lib/publications/issue-recipients.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { pickIssueRecipients } from './issue-recipients'

const ADMINS = ['admin1@larib.fr', 'admin2@larib.fr']

describe('pickIssueRecipients', () => {
  it('writes to the first author and copies the admins', () => {
    expect(pickIssueRecipients({ firstAuthorEmail: 'alice@larib.fr', adminEmails: ADMINS })).toEqual({
      to: ['alice@larib.fr'], cc: ADMINS, firstAuthorReached: true,
    })
  })

  it('falls back to the admins alone when the first author has no address', () => {
    expect(pickIssueRecipients({ firstAuthorEmail: null, adminEmails: ADMINS })).toEqual({
      to: ADMINS, cc: [], firstAuthorReached: false,
    })
  })

  it('never copies the first author twice when they are also an admin', () => {
    expect(pickIssueRecipients({ firstAuthorEmail: 'admin1@larib.fr', adminEmails: ADMINS })).toEqual({
      to: ['admin1@larib.fr'], cc: ['admin2@larib.fr'], firstAuthorReached: true,
    })
  })
})
```

**Step 2 à 4:** faire échouer, implémenter, faire passer.

**Step 5: Commit**

```bash
git commit -m "feat(publications): route an error report to whoever can fix it"
```

---

### Tâche 26 : signaler depuis la fiche

**Files:**
- Modify: `app/[locale]/publications/components/editor/editor-authors.tsx`
- Create: `app/[locale]/publications/components/article/report-issue-dialog.tsx`
- Modify: `app/[locale]/publications/actions.ts` (`reportPublicationIssueAction`)
- Modify: `lib/services/publications/publication-requests.ts`
- Modify: `lib/services/email.ts` (le mail de signalement)
- Modify: `messages/fr.json`, `messages/en.json`

**Step 1: Qui voit quoi**

Un seul point d'entrée sur la fiche, dont le libellé suit le rôle du lecteur :

| Lecteur | Libellé | Portée |
| --- | --- | --- |
| Premier auteur | « Demander une correction de la liste d'auteurs » | ce que seul l'admin peut modifier |
| Co-auteur | « Signaler une erreur » | message libre sur la publication |
| Ni l'un ni l'autre | rien | — |

La distinction se calcule avec `canEditArticle` de `lib/publications/editor-mode.ts`, déjà en
place. Ajouter au besoin un prédicat pur `canReportIssue` dans ce même module, avec son test.

**Step 2: La popup**

Un `Textarea` obligatoire, et pour le premier auteur un rappel de ce qu'il peut corriger seul.
Envoi par `useAction`, toast `sonner` sur succès et sur erreur.

**Step 3: L'envoi**

Le service crée un `PublicationRequest` de `kind: 'ERROR_REPORT'`, envoie le mail aux
destinataires calculés par `pickIssueRecipients`, et l'inscrit au journal des emails avec
`kind: 'ISSUE_REPORT'`. Quand `firstAuthorReached` est faux, la réponse le signale et l'interface
prévient l'utilisateur que seuls les admins ont été prévenus.

**Step 4: Commit**

```bash
git commit -m "feat(publications): let a co-author report an error on a publication"
```

---

### Tâche 27 : les signalements dans le tableau de bord admin

**Files:**
- Modify: `app/[locale]/publications/components/admin-dashboard/dashboard-view.tsx` (panneau des demandes)
- Modify: `lib/services/publications/publication-requests.ts` (`listPendingRequests` remonte `kind` et `message`)

Le panneau existant affiche les demandes en attente. Il gagne un badge de type — Liste d'auteurs
ou Signalement — et affiche le message pour un signalement. Les actions de résolution existantes
fonctionnent sans changement.

```bash
git commit -m "feat(publications): tell the two kinds of request apart in the admin panel"
```

---

# LOT 5 — Post LinkedIn

Une migration légère. Indépendant, se place où on veut.

---

### Tâche 28 : stocker le lien du post

**Files:**
- Modify: `prisma/schema.prisma` (modèle `Article`)
- Create: `prisma/migrations/<timestamp>_article_linkedin_post/migration.sql`

```prisma
linkedinPostUrl  String?
linkedinPostedAt DateTime?
```

Migration, application à `testdb`, redémarrage du serveur de dev, commit.

---

### Tâche 29 : dériver l'embed depuis l'URL

**Files:**
- Create: `lib/publications/linkedin-post.ts`
- Test: `lib/publications/linkedin-post.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { linkedinEmbedUrl } from './linkedin-post'

describe('linkedinEmbedUrl', () => {
  it('derives the embed from a share URL', () => {
    expect(linkedinEmbedUrl('https://www.linkedin.com/posts/cardio-larib_activity-7100000000000000000-AbCd'))
      .toBe('https://www.linkedin.com/embed/feed/update/urn:li:activity:7100000000000000000')
  })

  it('derives the embed from a feed update URL', () => {
    expect(linkedinEmbedUrl('https://www.linkedin.com/feed/update/urn:li:activity:7100000000000000000/'))
      .toBe('https://www.linkedin.com/embed/feed/update/urn:li:activity:7100000000000000000')
  })

  it('returns null on a URL it cannot read', () => {
    expect(linkedinEmbedUrl('https://example.com/post/42')).toBeNull()
    expect(linkedinEmbedUrl('')).toBeNull()
  })
})
```

**Step 2 à 4:** faire échouer, implémenter, faire passer.

**Step 5: Commit**

```bash
git commit -m "feat(publications): derive the LinkedIn embed from a pasted link"
```

---

### Tâche 30 : saisir et voir le post

**Files:**
- Modify: `app/[locale]/publications/components/communication/communication-card.tsx`
- Modify: `app/[locale]/publications/components/communication/communication-view.tsx`
- Modify: `app/[locale]/publications/actions.ts` (`setLinkedinPostAction`)
- Modify: `lib/publications/communication.ts` (le type d'item et les filtres)
- Modify: `messages/fr.json`, `messages/en.json`

**Step 1: La saisie**

Sur la carte Communication de la fiche, un champ URL et une date, réservés aux admins. Action
`setLinkedinPostAction`, toast sur succès et sur erreur.

**Step 2: L'affichage**

Quand `linkedinEmbedUrl` renvoie une adresse, une `iframe` de l'embed public LinkedIn ; sinon un
lien simple daté. Aucune iframe maison, aucun scraping.

**Step 3: La colonne**

Sur la page Communication, une colonne « Post LinkedIn » à trois états — absent, à faire, publié
— et le filtre correspondant, ajouté au module de sérialisation de la tâche 3 avec son test.

**Step 4: Commit**

```bash
git commit -m "feat(publications): attach the LinkedIn post to its publication"
```

---

# Tests de bout en bout

Deux parcours complets, pas une constellation de micro-tests. Les deux locales dans le **même**
test.

---

### Tâche 31 : parcours admin

**Files:**
- Create: `tests/e2e/publications-admin-journey.spec.ts`
- Modify: `prisma/seed.test.ts` (une publication acceptée avec un premier auteur qui a une adresse, et une ligne de journal d'email)

Un seul test qui enchaîne :

1. ouvrir le tableau de bord admin, poser un filtre de statut et une recherche ;
2. vérifier que l'adresse porte les paramètres ;
3. ouvrir une publication, revenir par `page.goBack()`, vérifier que les filtres sont toujours
   posés ;
4. lire le repère « mail com envoyé » sur la fiche et dans la liste ;
5. ouvrir la popup du mail com, basculer sur l'onglet Aperçu, vérifier que le titre entre
   guillemets y est en gras et que la mention d'envoi automatique est présente ;
6. ouvrir la page Emails et retrouver l'envoi avec son contenu.

Run: `PLAYWRIGHT_PORT=3100 npm run test:e2e tests/e2e/publications-admin-journey.spec.ts`

Toujours `PLAYWRIGHT_PORT=3100` : sans lui, Playwright réutilise silencieusement le serveur de
dev du port 3000. Nettoyer les processus orphelins avant de relancer.

```bash
git commit -m "test(publications): cover the admin journey end to end"
```

---

### Tâche 32 : parcours membre

**Files:**
- Create: `tests/e2e/publications-member-journey.spec.ts`
- Modify: `prisma/seed.test.ts` (une publication où le membre de test est co-auteur, une autre où il est premier auteur)

Un seul test qui enchaîne :

1. ouvrir une publication où le membre est **co-auteur**, cliquer sur « Signaler une erreur »,
   envoyer un message ;
2. se connecter en admin et vérifier que la demande apparaît avec son badge de type et son
   message ;
3. revenir sur une publication dont le membre est **premier auteur** et vérifier que le bouton de
   demande de liste d'auteurs est visible **sans** passer par Éditer.

```bash
git commit -m "test(publications): cover the member journey end to end"
```

---

### Tâche 33 : validation finale

```bash
FULL_PUSH_VALIDATION=1 git push
```

Attendu : `check:untracked-sources`, typecheck, unitaires, build et suite E2E complète au vert.
Vérifier ensuite le déploiement :

```bash
vercel ls
vercel inspect <url> --logs
```

Les trois migrations doivent s'être appliquées pendant le build.
