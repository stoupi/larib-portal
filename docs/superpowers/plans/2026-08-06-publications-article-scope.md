# Article scope (Lariboisière team / outside the team) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tag every publication as `LARIB_TEAM` or `OUTSIDE_TEAM`, hide the outside ones from the admin views by default, and let the admin set the tag from the PubMed import table, the library and the editor.

**Architecture:** A pure module `lib/publications/article-scope.ts` owns the values, the auto-proposal rule (≥ 3 `OUR_TEAM` authors) and the badge styling — no Prisma import, so it is unit-testable. Prisma gains an `ArticleScope` enum and an `Article.scope` column defaulting to `LARIB_TEAM`. The dashboard filter object gains a `scopes: string[]` entry defaulting to `['LARIB_TEAM']`, so KPIs, charts and the table only count team work until the new "By scope" card includes the rest. Writes go through one server action per surface, mirroring `updateArticleStudyAction`.

**Tech Stack:** Next.js 15 App Router, Prisma/PostgreSQL, next-safe-action, next-intl, Vitest, Playwright.

---

### Task 1: Scope values, proposal rule and badge

**Files:**
- Create: `lib/publications/article-scope.ts`
- Test: `lib/publications/article-scope.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/publications/article-scope.test.ts
import { describe, expect, it } from 'vitest'
import { ARTICLE_SCOPES, TEAM_AUTHOR_THRESHOLD, proposeArticleScope } from './article-scope'

describe('ARTICLE_SCOPES', () => {
  it('lists the team scope first', () => {
    expect(ARTICLE_SCOPES).toEqual(['LARIB_TEAM', 'OUTSIDE_TEAM'])
  })
})

describe('proposeArticleScope', () => {
  const team = { team: true }
  const external = { team: false }

  it('proposes the team scope from three team authors on', () => {
    expect(proposeArticleScope([team, team, team])).toBe('LARIB_TEAM')
    expect(proposeArticleScope([team, external, team, team, external])).toBe('LARIB_TEAM')
  })

  it('proposes the outside scope below the threshold', () => {
    expect(proposeArticleScope([])).toBe('OUTSIDE_TEAM')
    expect(proposeArticleScope([external, external])).toBe('OUTSIDE_TEAM')
    expect(proposeArticleScope([team])).toBe('OUTSIDE_TEAM')
    expect(proposeArticleScope([team, team])).toBe('OUTSIDE_TEAM')
  })

  it('exposes the threshold it applies', () => {
    expect(TEAM_AUTHOR_THRESHOLD).toBe(3)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/publications/article-scope.test.ts`
Expected: FAIL — `Failed to resolve import "./article-scope"`

- [ ] **Step 3: Write the implementation**

```typescript
// lib/publications/article-scope.ts
export const ARTICLE_SCOPES = ['LARIB_TEAM', 'OUTSIDE_TEAM'] as const
export type ArticleScopeValue = (typeof ARTICLE_SCOPES)[number]

// Beyond three signatories from the team, the work was led here.
export const TEAM_AUTHOR_THRESHOLD = 3

export function proposeArticleScope(authors: { team: boolean }[]): ArticleScopeValue {
  const teamAuthors = authors.filter((author) => author.team).length
  return teamAuthors >= TEAM_AUTHOR_THRESHOLD ? 'LARIB_TEAM' : 'OUTSIDE_TEAM'
}

export const ARTICLE_SCOPE_BADGE: Record<ArticleScopeValue, string> = {
  LARIB_TEAM:
    'text-coral-700 bg-coral-50 border-coral-200 dark:text-coral-300 dark:bg-coral-500/15 dark:border-coral-500/30',
  OUTSIDE_TEAM:
    'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-white/10 dark:border-white/10',
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/publications/article-scope.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add lib/publications/article-scope.ts lib/publications/article-scope.test.ts
git commit -m "feat(publications): article scope values and proposal rule"
```

---

### Task 2: Prisma enum, column and migration

**Files:**
- Modify: `prisma/schema.prisma` (enum block near `ArticleType` line 99, `model Article` line 558)
- Create: `prisma/migrations/<timestamp>_article_scope/migration.sql` (generated)

- [ ] **Step 1: Add the enum and the column**

In `prisma/schema.prisma`, right after the `ArticleType` enum:

```prisma
enum ArticleScope {
  LARIB_TEAM
  OUTSIDE_TEAM
}
```

In `model Article`, right after the `type` line:

```prisma
  scope              ArticleScope  @default(LARIB_TEAM)
```

- [ ] **Step 2: Create the migration**

Run: `npx prisma migrate dev --name article_scope`
Expected: `Your database is now in sync with your schema.` and a new folder under `prisma/migrations/`.

Never run `prisma migrate reset`.

- [ ] **Step 3: Restart the dev server**

Kill and restart `npm run dev` — the in-memory Prisma client is stale after a migration and writes on the new field fail otherwise.

- [ ] **Step 4: Verify the column exists**

Run: `npx prisma studio` is not needed; instead run
`npx tsc --noEmit`
Expected: no output (the generated client now types `scope`).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(publications): add the article scope column"
```

---

### Task 3: Carry the scope through the dashboard read model

**Files:**
- Modify: `lib/publications/admin-dashboard.ts` (type `DashboardArticleItem` line 7)
- Modify: `lib/services/publications/dashboard.ts` (select line 15, mapping line 55)
- Test: `lib/publications/admin-dashboard.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `lib/publications/admin-dashboard.test.ts`, inside the existing `describe('filterDashboardArticles')`:

```typescript
  it('keeps only the team publications by default and widens on demand', () => {
    const mixed = [
      article({ id: 'team', scope: 'LARIB_TEAM' }),
      article({ id: 'outside', scope: 'OUTSIDE_TEAM' }),
    ]
    expect(filterDashboardArticles(mixed, DEFAULT_DASHBOARD_FILTERS).map((item) => item.id)).toEqual(['team'])
    expect(
      filterDashboardArticles(mixed, { ...DEFAULT_DASHBOARD_FILTERS, scopes: ['LARIB_TEAM', 'OUTSIDE_TEAM'] }).map(
        (item) => item.id,
      ),
    ).toEqual(['team', 'outside'])
    expect(
      filterDashboardArticles(mixed, { ...DEFAULT_DASHBOARD_FILTERS, scopes: ['OUTSIDE_TEAM'] }).map((item) => item.id),
    ).toEqual(['outside'])
  })
```

In the same file, extend the `article()` helper defaults with `scope: 'LARIB_TEAM' as const,` so every existing fixture stays a team publication.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/publications/admin-dashboard.test.ts`
Expected: FAIL — `Object literal may only specify known properties, and 'scope' does not exist` / `scopes` unknown.

- [ ] **Step 3: Extend the model and the filter**

In `lib/publications/admin-dashboard.ts`:

```typescript
import { type ArticleScopeValue } from './article-scope'
```

Add to `DashboardArticleItem` (after `status`):

```typescript
  scope: ArticleScopeValue
```

Add to `DashboardFilters` (after `statuses`):

```typescript
  scopes: string[]
```

Add to `DEFAULT_DASHBOARD_FILTERS` (after `statuses: []`):

```typescript
  scopes: ['LARIB_TEAM'],
```

Add to `filterDashboardArticles`, as the first check inside the callback:

```typescript
    if (filters.scopes.length > 0 && !filters.scopes.includes(article.scope)) return false
```

- [ ] **Step 4: Feed the field from the database**

In `lib/services/publications/dashboard.ts`, add `scope: true,` to the `select` block (next to `status: true`), and `scope: article.scope,` to the returned object (next to `status: article.status,`).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/publications/admin-dashboard.test.ts && npx tsc --noEmit`
Expected: PASS, then no TypeScript output.

- [ ] **Step 6: Commit**

```bash
git add lib/publications/admin-dashboard.ts lib/publications/admin-dashboard.test.ts lib/services/publications/dashboard.ts
git commit -m "feat(publications): filter the dashboard on the article scope"
```

---

### Task 4: Scope counts for the "By scope" card

**Files:**
- Modify: `lib/publications/admin-dashboard.ts` (`DashboardMetrics`, `computeDashboardMetrics`)
- Test: `lib/publications/admin-dashboard.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new block to `lib/publications/admin-dashboard.test.ts`:

```typescript
describe('scope counts', () => {
  it('counts both scopes, team first, ignoring the empty one', () => {
    const mixed = [
      article({ id: '1', scope: 'LARIB_TEAM' }),
      article({ id: '2', scope: 'OUTSIDE_TEAM' }),
      article({ id: '3', scope: 'OUTSIDE_TEAM' }),
    ]
    expect(computeDashboardMetrics(mixed, 2025).byScope).toEqual([
      { scope: 'LARIB_TEAM', count: 1 },
      { scope: 'OUTSIDE_TEAM', count: 2 },
    ])
    expect(computeDashboardMetrics([article({ id: '1' })], 2025).byScope).toEqual([
      { scope: 'LARIB_TEAM', count: 1 },
    ])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/publications/admin-dashboard.test.ts -t "scope counts"`
Expected: FAIL — `byScope` is undefined.

- [ ] **Step 3: Compute the counts**

In `lib/publications/admin-dashboard.ts`, add the type next to `StatusCount`:

```typescript
export type ScopeCount = { scope: ArticleScopeValue; count: number }
```

Add `byScope: ScopeCount[]` to `DashboardMetrics`, then inside `computeDashboardMetrics`:

```typescript
  const scopeCounts = new Map<ArticleScopeValue, number>()
```

in the loop over articles:

```typescript
    scopeCounts.set(article.scope, (scopeCounts.get(article.scope) ?? 0) + 1)
```

before the `return`:

```typescript
  const byScope: ScopeCount[] = ARTICLE_SCOPES.filter((scope) => (scopeCounts.get(scope) ?? 0) > 0).map((scope) => ({
    scope,
    count: scopeCounts.get(scope) ?? 0,
  }))
```

and `byScope,` in the returned object. Extend the import to `import { ARTICLE_SCOPES, type ArticleScopeValue } from './article-scope'`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/publications/admin-dashboard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/publications/admin-dashboard.ts lib/publications/admin-dashboard.test.ts
git commit -m "feat(publications): count publications per scope"
```

---

### Task 5: Service and action to change the scope

**Files:**
- Modify: `lib/services/publications/articles.ts` (next to `updateArticleStudy`)
- Modify: `app/[locale]/publications/actions.ts` (next to `updateArticleStudyAction`)

- [ ] **Step 1: Write the service**

In `lib/services/publications/articles.ts`, after `updateArticleStudy`:

```typescript
export async function updateArticleScope(id: string, scope: ArticleScopeValue) {
  return prisma.article.update({ where: { id }, data: { scope }, select: { id: true, scope: true } })
}
```

with `import type { ArticleScopeValue } from '@/lib/publications/article-scope'` added at the top.

- [ ] **Step 2: Write the action**

In `app/[locale]/publications/actions.ts`, next to `updateArticleStudyAction`:

```typescript
export const updateArticleScopeAction = authenticatedAction
  .inputSchema(z.object({ id: z.string().min(1), scope: z.enum(ARTICLE_SCOPES) }))
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    const canEdit = canAdminApp(ctx.user, 'PUBLICATIONS') || (await userIsFirstAuthor(ctx.userId, parsedInput.id))
    if (!canEdit) throw new Error('Forbidden')
    const updated = await updateArticleScope(parsedInput.id, parsedInput.scope)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return updated
  })
```

Add `updateArticleScope` to the existing import from `@/lib/services/publications/articles`, and `import { ARTICLE_SCOPES } from '@/lib/publications/article-scope'`.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add lib/services/publications/articles.ts "app/[locale]/publications/actions.ts"
git commit -m "feat(publications): action to set the article scope"
```

---

### Task 6: Scope select and badge in the article rows

**Files:**
- Create: `app/[locale]/publications/components/articles/article-scope-select.tsx`
- Modify: `app/[locale]/publications/components/articles/article-list-row.tsx`
- Modify: `messages/en.json`, `messages/fr.json`

- [ ] **Step 1: Add the translations**

In both files, inside `publications.articles`, add:

```json
"scope": { "LARIB_TEAM": "Lariboisière team", "OUTSIDE_TEAM": "Outside the team" },
"scopeLabel": "Affiliation scope",
"scopeSaved": "Affiliation scope updated"
```

French values: `"Équipe Lariboisière"`, `"Hors équipe"`, `"Rattachement"`, `"Rattachement mis à jour"`.

- [ ] **Step 2: Write the select component**

```tsx
// app/[locale]/publications/components/articles/article-scope-select.tsx
'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { ARTICLE_SCOPES, type ArticleScopeValue } from '@/lib/publications/article-scope'
import { updateArticleScopeAction } from '../../actions'

export function ArticleScopeSelect({
  articleId,
  articleTitle,
  scope,
}: {
  articleId: string
  articleTitle: string
  scope: ArticleScopeValue
}) {
  const t = useTranslations('publications.articles')
  const router = useRouter()
  const { execute, isExecuting } = useAction(updateArticleScopeAction, {
    onSuccess() {
      toast.success(t('scopeSaved'))
      router.refresh()
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  return (
    <select
      value={scope}
      disabled={isExecuting}
      aria-label={`${t('scopeLabel')}: ${articleTitle}`}
      onChange={(event) => execute({ id: articleId, scope: event.target.value as ArticleScopeValue })}
      className="w-full truncate rounded-md border border-line bg-bg-surface px-2 py-1 text-[11.5px] font-bold text-text-secondary transition disabled:opacity-60"
    >
      {ARTICLE_SCOPES.map((value) => (
        <option key={value} value={value}>
          {t(`scope.${value}`)}
        </option>
      ))}
    </select>
  )
}
```

- [ ] **Step 3: Show it in the admin rows and badge it elsewhere**

In `app/[locale]/publications/components/articles/article-list-row.tsx`:

- widen the grid: `'grid grid-cols-[minmax(240px,1fr)_150px_128px_128px_128px_176px_132px] items-center gap-3.5'`
- add a cell right after the study cell:

```tsx
        <div className="min-w-0">
          {admin ? (
            <ArticleScopeSelect
              articleId={article.id}
              articleTitle={article.title || t('myPub.untitled')}
              scope={article.scope}
            />
          ) : (
            <span
              className={cn(
                'inline-flex rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide',
                ARTICLE_SCOPE_BADGE[article.scope],
              )}
            >
              {t(`articles.scope.${article.scope}`)}
            </span>
          )}
        </div>
```

- import `ArticleScopeSelect` and `ARTICLE_SCOPE_BADGE`
- add `'scope'` to the header labels: in `ArticlesHeaderRow`, `ARTICLE_SORT_KEYS` drives the sortable columns, so insert a plain `<span className={HEADER_LABEL_CLASS}>{tArticles('scopeLabel')}</span>` between the study and status headers, with `const tArticles = useTranslations('publications.articles')` added to that component.

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/publications/components/articles" messages/en.json messages/fr.json
git commit -m "feat(publications): set the scope from the article table"
```

---

### Task 7: "By scope" card and filter default in the dashboard

**Files:**
- Modify: `app/[locale]/publications/components/admin-dashboard/dashboard-charts.tsx`
- Modify: `messages/en.json`, `messages/fr.json`

- [ ] **Step 1: Add the translations**

In `publications.adminHome.charts`: `"byScope": "By scope"` / `"Par rattachement"`.
In `publications.adminHome.filters`: `"clearScopeFilter": "Show every scope"` / `"Afficher tous les rattachements"`.

- [ ] **Step 2: Add the card**

In `dashboard-charts.tsx`, before the "By status" section, add a sixth card following the exact shape of the "By study" card:

```tsx
      <section className="flex h-[296px] flex-col rounded-2xl border border-line bg-bg-surface p-4 shadow-elevation-xs">
        <CardHeaderRow
          title={t('byScope')}
          clear={
            filters.scopes.length > 0
              ? { label: tFilters('clearScopeFilter'), onClear: () => onFilter({ scopes: [] }) }
              : null
          }
        />
        <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-2">
          {metrics.byScope.map((entry) => {
            const active = filters.scopes.includes(entry.scope)
            return (
              <li key={entry.scope}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onFilter({ scopes: toggleFilterValue(filters.scopes, entry.scope) })}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition',
                    active ? 'bg-coral-50 dark:bg-coral-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5',
                  )}
                >
                  <span
                    className={cn(
                      'size-2.5 shrink-0 rounded-full',
                      entry.scope === 'LARIB_TEAM' ? 'bg-coral-500' : 'bg-gray-300 dark:bg-white/25',
                    )}
                  />
                  <span className="flex-1 truncate text-[13px] text-text-primary">{tArticles(`scope.${entry.scope}`)}</span>
                  <span className="pl-2 text-[13px] font-bold text-text-primary tabular-nums">{entry.count}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
```

Add `const tArticles = useTranslations('publications.articles')` to the component and change the grid to `'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6'`.

Note: `metrics.byScope` only counts the *filtered* articles, so with the default filter the card shows the team count alone. Clearing the filter (`scopes: []`) reveals both — that is what the clear button does.

- [ ] **Step 3: Keep "Clear filters" on the team default**

In `dashboard-view.tsx`, the reset already uses `DEFAULT_DASHBOARD_FILTERS`, which now carries `scopes: ['LARIB_TEAM']` — nothing to change. Verify the `hasActiveFilters` computation ignores the scope default by adding this condition:

```typescript
    filters.scopes.join() !== DEFAULT_DASHBOARD_FILTERS.scopes.join() ||
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/publications/components/admin-dashboard" messages/en.json messages/fr.json
git commit -m "feat(publications): by-scope card on the admin dashboard"
```

---

### Task 8: Scope in the PubMed import table

**Files:**
- Modify: `lib/publications/import-candidates.ts` (add the proposed scope)
- Modify: `lib/publications/import-candidates.test.ts`
- Modify: `app/[locale]/publications/actions.ts` (`importBacklogAction` input)
- Modify: `lib/services/publications/import.ts` (`importRecords` signature)
- Modify: `app/[locale]/publications/components/backlog-import.tsx`
- Modify: `messages/en.json`, `messages/fr.json`

- [ ] **Step 1: Write the failing test**

Add to `lib/publications/import-candidates.test.ts`:

```typescript
describe('proposed scope', () => {
  it('proposes the team scope only from three team authors on', () => {
    const [oneTeam, threeTeam] = matchCandidates(
      [
        candidate({ pmid: '1', teamAuthors: 1 }),
        candidate({ pmid: '2', teamAuthors: 3 }),
      ],
      { pmids: [], dois: [] },
    )
    expect(oneTeam.proposedScope).toBe('OUTSIDE_TEAM')
    expect(threeTeam.proposedScope).toBe('LARIB_TEAM')
  })
})
```

Extend the local `candidate()` helper in that test file with `teamAuthors: 0` by default, mapped onto the new `PubmedCandidate` field described in step 3.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/publications/import-candidates.test.ts`
Expected: FAIL — `proposedScope` is undefined.

- [ ] **Step 3: Carry the team-author count and propose the scope**

`PubmedCandidate` (in `types/publications.ts`) gains `teamAuthors: number`. In `lib/services/publications/pubmed.ts`, `summarize()` cannot know the team, so the count is filled in the action: after `searchPubmed`, fetch the full records for the returned PMIDs is too costly — instead, count from the summary's `firstAuthor`/`lastAuthor` is not enough either. Therefore the count is computed server-side in `searchBacklogAction` with a single `prisma.author.findMany({ where: { type: 'OUR_TEAM' }, select: { lastName: true, initials: true } })` and the existing `authorFirstInitial` helper applied to the candidate's `firstAuthor`/`lastAuthor` strings — which yields at most 2. Since the threshold is 3, the proposal from a summary alone can never reach `LARIB_TEAM`; so the import table fetches the full author list (Task 9) and recomputes the proposal from it. Until a row is expanded, the select shows `OUTSIDE_TEAM`.

In `lib/publications/import-candidates.ts`:

```typescript
import { proposeArticleScope, type ArticleScopeValue } from './article-scope'
```

`ImportCandidate` gains `proposedScope: ArticleScopeValue`, filled in `matchCandidates`:

```typescript
    const proposedScope = proposeArticleScope(Array.from({ length: candidate.teamAuthors }, () => ({ team: true })))
```

- [ ] **Step 4: Let the import carry a scope per PMID**

`importBacklogAction` input becomes:

```typescript
  .inputSchema(
    z.object({
      papers: z.array(z.object({ pmid: z.string().min(1), scope: z.enum(ARTICLE_SCOPES) })).min(1),
    }),
  )
```

and passes a `Map<string, ArticleScopeValue>` to `importRecords(records, ctx.userId, scopeByPmid)`. In `lib/services/publications/import.ts`, `importRecords` takes that third argument and sets `scope: scopeByPmid.get(record.pmid) ?? 'OUTSIDE_TEAM'` in the `prisma.article.create` data.

- [ ] **Step 5: Add the select to the import table**

In `backlog-import.tsx`, hold `const [scopes, setScopes] = useState<Record<string, ArticleScopeValue>>({})`, seeded from `proposedScope` on each search, add a `Scope` column with the same `<select>` markup as Task 6 (writing into local state, not the server), and send `papers: Array.from(selected).map((pmid) => ({ pmid, scope: scopes[pmid] ?? 'OUTSIDE_TEAM' }))` on import.

Translations in `publications.import`: `"colScope": "Scope"` / `"Rattachement"`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, no TypeScript output

- [ ] **Step 7: Commit**

```bash
git add lib/publications/import-candidates.ts lib/publications/import-candidates.test.ts lib/services/publications/import.ts "app/[locale]/publications" types/publications.ts messages/en.json messages/fr.json
git commit -m "feat(publications): choose the scope from the import table"
```

---

### Task 9: Expandable import row with the full author list

**Files:**
- Modify: `lib/services/publications/pubmed.ts` (reuse `fetchByPmids`)
- Modify: `app/[locale]/publications/actions.ts`
- Modify: `app/[locale]/publications/components/backlog-import.tsx`
- Modify: `messages/en.json`, `messages/fr.json`

- [ ] **Step 1: Add the detail action**

```typescript
export const fetchCandidateDetailAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ pmid: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const [record] = await fetchByPmids([parsedInput.pmid])
    if (!record) return null
    const teamAuthors = await prisma.author.findMany({
      where: { type: 'OUR_TEAM' },
      select: { lastName: true, initials: true, firstName: true },
    })
    const authors = record.authors.map((author) => ({
      name: `${author.foreName ?? author.initials ?? ''} ${author.lastName}`.trim(),
      team: teamAuthors.some(
        (teamAuthor) =>
          normalizeName(teamAuthor.lastName) === normalizeName(author.lastName) &&
          authorFirstInitial(teamAuthor) === authorFirstInitial(author),
      ),
    }))
    return { authors, abstract: record.abstract?.slice(0, 400) ?? null, doi: record.doi }
  })
```

`normalizeName` and `authorFirstInitial` come from `@/lib/services/publications/import-dedupe`.

- [ ] **Step 2: Expand the row on demand**

In `backlog-import.tsx`, add a chevron button per row (same markup as `ArticleListRow`'s toggle), keep `const [details, setDetails] = useState<Record<string, CandidateDetail>>({})`, call the action on first expand, and render the authors inline — team members in coral, others in the muted colour — plus the abstract excerpt. When the detail arrives, recompute the proposed scope with `proposeArticleScope(detail.authors)` and update the row's select unless the admin already changed it.

Translations in `publications.import`: `"toggleDetail": "Show the authors"` / `"Afficher les auteurs"`, `"noAbstract": "No abstract"` / `"Pas de résumé"`.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/publications" messages/en.json messages/fr.json
git commit -m "feat(publications): expand an import row to see its authors"
```

---

### Task 10: My Publications shows the scope

**Files:**
- Modify: `lib/services/publications/my-publications.ts` (`MyPublicationItem`, select, mapping)
- Modify: `app/[locale]/publications/components/my-publications.tsx`

- [ ] **Step 1: Carry the field**

Add `scope: ArticleScopeValue` to `MyPublicationItem`, `scope: true` to the Prisma select and `scope: article.scope` to the mapping.

- [ ] **Step 2: Badge it in the list**

Next to the type badge in `my-publications.tsx`, render:

```tsx
              <span
                className={cn(
                  'inline-flex rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide',
                  ARTICLE_SCOPE_BADGE[item.scope],
                )}
              >
                {tArticles(`scope.${item.scope}`)}
              </span>
```

No filter is added: the user sees every publication of theirs, which is the point.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add lib/services/publications/my-publications.ts "app/[locale]/publications/components/my-publications.tsx"
git commit -m "feat(publications): show the scope in my publications"
```

---

### Task 11: Scope field in the publication editor

**Files:**
- Modify: `lib/services/publications/publication-editor.ts` (`getPublicationForEdit` select)
- Modify: `app/[locale]/publications/components/editor/editor-header.tsx`

The editor is the path a user takes on their own publication, so this is where somebody tags a paper as personal.

- [ ] **Step 1: Read the field**

In `getPublicationForEdit`, add `scope: true,` to the `select` block (next to `status: true`).

- [ ] **Step 2: Add the control next to Type and Status**

In `editor-header.tsx`, after the status `<label>`, add:

```tsx
            <label className="flex items-center gap-2 text-[13px] font-semibold text-text-secondary">
              {tArticles('scopeLabel')}
              <ArticleScopeSelect
                articleId={article.id}
                articleTitle={article.title || t('myPub.untitled')}
                scope={article.scope}
              />
            </label>
```

with `const tArticles = useTranslations('publications.articles')` and the import of `ArticleScopeSelect` from `../articles/article-scope-select`. The select writes through its own action, like the study select in the table, so it does not join the react-hook-form payload.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 4: Check the permission path by hand**

Log in as `publications-user@larib-portal.test`, open one of their publications, switch the scope to `Outside the team`, and confirm the toast. The action allows it because the user is the first author; on somebody else's article it returns Forbidden.

- [ ] **Step 5: Commit**

```bash
git add lib/services/publications/publication-editor.ts "app/[locale]/publications/components/editor/editor-header.tsx"
git commit -m "feat(publications): set the scope from the publication editor"
```

---

### Task 12: End-to-end coverage

**Files:**
- Modify: `tests/e2e/publications-admin-dashboard.spec.ts`
- Modify: `tests/e2e/publications-import.spec.ts`
- Modify: `prisma/seed.test.ts`

- [ ] **Step 1: Seed one publication of each scope**

In `prisma/seed.test.ts`, after the existing article, create a second one:

```typescript
	await prisma.article.create({
		data: {
			title: 'Personal cohort study from a previous laboratory',
			type: 'ORIGINAL',
			status: 'PUBLISHED',
			scope: 'OUTSIDE_TEAM',
			createdBy: { connect: { id: publicationsUser.id } },
			authorships: { create: [{ order: 1, author: { connect: { id: publicationsFirstAuthor.id } } }] },
		},
	});
```

- [ ] **Step 2: Assert the admin default and the toggle**

In `tests/e2e/publications-admin-dashboard.spec.ts`, right after the library opens:

```typescript
  // Outside-the-team publications stay out of the default admin view
  const outsideArticle = page.getByRole('link', { name: 'Personal cohort study from a previous laboratory' })
  await expect(outsideArticle).toHaveCount(0)
  const scopeCard = page.locator('section').filter({ has: page.getByRole('heading', { name: 'By scope' }) }).last()
  await scopeCard.getByRole('button', { name: 'Show every scope' }).click()
  await expect(outsideArticle).toBeVisible()
```

- [ ] **Step 3: Assert the user still sees it**

In the same file or `publications.spec.ts`, log in as `publications-user@larib-portal.test`, go to `/en/publications` and assert both the seeded team article and `Personal cohort study from a previous laboratory` are listed with their badges.

- [ ] **Step 4: Assert the import scope select**

In `tests/e2e/publications-import.spec.ts`, after the search:

```typescript
  await rows.first().getByRole('combobox').selectOption('LARIB_TEAM')
  await page.getByRole('button', { name: /import selected \(1\)/i }).click()
```

then assert on the admin library that the imported article appears in the default (team) view.

- [ ] **Step 5: Run the suites**

Run: `npm run test:seed && PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/publications-admin-dashboard.spec.ts tests/e2e/publications-import.spec.ts tests/e2e/publications-editor.spec.ts --workers=1`
Expected: 3 passed

- [ ] **Step 6: Commit**

```bash
git add tests/e2e prisma/seed.test.ts
git commit -m "test(publications): cover the article scope end to end"
```

---

### Task 13: Full validation

- [ ] **Step 1: Run the complete gate**

Run: `npm run verify:push`
Expected: unit tests pass, build succeeds, the full Playwright suite passes.

- [ ] **Step 2: Fix any failure at its root**

Never weaken a test to make the gate pass.

- [ ] **Step 3: Commit any fix**

```bash
git add -A
git commit -m "fix(publications): address the push validation feedback"
```
