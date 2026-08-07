# Publications Admin/User Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep an administrator inside `/publications/admin/*` while they work, so the sidebar never silently flips to the user branch, per `docs/superpowers/specs/2026-08-07-publications-admin-user-separation-design.md`.

**Architecture:** A pure module `lib/publications/base-path.ts` maps a branch (`'/publications'` or `'/publications/admin'`) to every destination in the app. Shared components stop hardcoding absolute paths and instead take a `basePath` prop and build links from it. Two missing admin routes are added (`admin/authors/new`, `admin/articles/[id]`), each a thin server page that reuses the existing component with the admin guard and the admin base path. `ArticlePage` stops inferring its branch from `viewer.isAdmin` and receives `basePath` instead.

**Tech Stack:** Next.js 15 App Router, next-intl, Vitest, Playwright.

---

## File structure

| File | Responsibility |
| --- | --- |
| `lib/publications/base-path.ts` | Pure. Maps a base path to every destination. Single place to add a route. |
| `app/[locale]/publications/admin/authors/new/page.tsx` | New. Admin-guarded author creation. |
| `app/[locale]/publications/admin/articles/[id]/page.tsx` | New. Admin-guarded article page; redirects non-admins to the user route. |
| `authors-manager.tsx`, `add-author-form.tsx`, `manual-entry-form.tsx`, `doi-import-panel.tsx` | Take `basePath`, build links from it. |
| `article-page.tsx` | Takes `basePath` for back link and breadcrumb, instead of guessing from the viewer's role. |
| `article-list-row.tsx`, `admin-author-requests.tsx`, `new-publication-button.tsx` | Point at the correct branch. |

---

### Task 1: The `base-path` module

**Files:**
- Create: `lib/publications/base-path.ts`
- Test: `lib/publications/base-path.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { publicationsPaths, PUBLICATIONS_BASE, PUBLICATIONS_ADMIN_BASE } from './base-path'

describe('publicationsPaths', () => {
  it('builds user-branch destinations', () => {
    const paths = publicationsPaths(PUBLICATIONS_BASE)
    expect(paths.root).toBe('/publications')
    expect(paths.authorsList).toBe('/publications/authors')
    expect(paths.newAuthor).toBe('/publications/authors/new')
    expect(paths.article('abc')).toBe('/publications/articles/abc')
    expect(paths.articleEdit('abc')).toBe('/publications/articles/abc?mode=edit')
  })

  it('builds admin-branch destinations', () => {
    const paths = publicationsPaths(PUBLICATIONS_ADMIN_BASE)
    expect(paths.root).toBe('/publications/admin')
    expect(paths.authorsList).toBe('/publications/admin/authors')
    expect(paths.newAuthor).toBe('/publications/admin/authors/new')
    expect(paths.article('abc')).toBe('/publications/admin/articles/abc')
    expect(paths.articleEdit('abc')).toBe('/publications/admin/articles/abc?mode=edit')
  })

  it('keeps the two branches disjoint for the same article', () => {
    const user = publicationsPaths(PUBLICATIONS_BASE).article('x1')
    const admin = publicationsPaths(PUBLICATIONS_ADMIN_BASE).article('x1')
    expect(user).not.toBe(admin)
    expect(admin.startsWith(PUBLICATIONS_ADMIN_BASE)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/publications/base-path.test.ts`
Expected: FAIL with "Cannot find module './base-path'"

- [ ] **Step 3: Write the implementation**

```ts
export const PUBLICATIONS_BASE = '/publications'
export const PUBLICATIONS_ADMIN_BASE = '/publications/admin'

export type PublicationsBasePath = typeof PUBLICATIONS_BASE | typeof PUBLICATIONS_ADMIN_BASE

export type PublicationsPaths = {
  root: string
  authorsList: string
  newAuthor: string
  article: (articleId: string) => string
  articleEdit: (articleId: string) => string
}

export function publicationsPaths(basePath: PublicationsBasePath): PublicationsPaths {
  return {
    root: basePath,
    authorsList: `${basePath}/authors`,
    newAuthor: `${basePath}/authors/new`,
    article: (articleId) => `${basePath}/articles/${articleId}`,
    articleEdit: (articleId) => `${basePath}/articles/${articleId}?mode=edit`,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/publications/base-path.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/publications/base-path.ts lib/publications/base-path.test.ts
git commit -m "feat(publications): add pure base-path module for branch-aware links"
```

---

### Task 2: `ManualEntryForm` and `DoiImportPanel` take `basePath`

**Files:**
- Modify: `app/[locale]/publications/components/manual-entry-form.tsx`
- Modify: `app/[locale]/publications/components/doi-import-panel.tsx`

- [ ] **Step 1: `manual-entry-form.tsx`**

Add the import:

```tsx
import { publicationsPaths, type PublicationsBasePath } from '@/lib/publications/base-path'
```

Add `basePath` to the component's `Props` type and destructuring, so the signature at line 58 becomes:

```tsx
export function ManualEntryForm({ centres, users, basePath }: Props) {
```

Immediately after the existing `const router = useRouter()` line inside the component, add:

```tsx
  const paths = publicationsPaths(basePath)
```

Replace BOTH occurrences of `router.push('/publications/authors')` (lines 86 and 206) with:

```tsx
router.push(paths.authorsList)
```

- [ ] **Step 2: `doi-import-panel.tsx`**

Add the import:

```tsx
import { publicationsPaths, type PublicationsBasePath } from '@/lib/publications/base-path'
```

Change the signature (line 22) to:

```tsx
export function DoiImportPanel({ basePath }: { basePath: PublicationsBasePath }) {
```

Immediately after `const router = useRouter()`, add:

```tsx
  const paths = publicationsPaths(basePath)
```

Replace `router.push('/publications/authors')` (line 41) with:

```tsx
      router.push(paths.authorsList)
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only in `add-author-form.tsx` (it renders both components without the new required prop) — fixed in Task 3. No other errors.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/publications/components/manual-entry-form.tsx app/\[locale\]/publications/components/doi-import-panel.tsx
git commit -m "feat(publications): build author-form redirects from the active branch"
```

---

### Task 3: `AddAuthorForm` threads `basePath` through

**Files:**
- Modify: `app/[locale]/publications/components/add-author-form.tsx`

- [ ] **Step 1: Add the prop and pass it down**

Add the import:

```tsx
import { type PublicationsBasePath } from '@/lib/publications/base-path'
```

Add `basePath: PublicationsBasePath` to the `Props` type, add it to the destructuring on line 18, and pass it to both children on line 39:

```tsx
      {tab === 'manual' ? (
        <ManualEntryForm centres={centres} users={users} basePath={basePath} />
      ) : (
        <DoiImportPanel basePath={basePath} />
      )}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only in `app/[locale]/publications/authors/new/page.tsx` (renders `AddAuthorForm` without the new prop) — fixed in Task 4.

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/publications/components/add-author-form.tsx
git commit -m "feat(publications): thread the active branch through the add-author form"
```

---

### Task 4: The user author pages use the module; add the admin author-creation route

**Files:**
- Modify: `app/[locale]/publications/authors/page.tsx`
- Modify: `app/[locale]/publications/authors/new/page.tsx`
- Create: `app/[locale]/publications/admin/authors/new/page.tsx`

- [ ] **Step 1: `authors/page.tsx` — build its own link from the module**

Add the import:

```tsx
import { publicationsPaths, PUBLICATIONS_BASE } from '@/lib/publications/base-path'
```

Inside the component, before the `return`, add:

```tsx
  const paths = publicationsPaths(PUBLICATIONS_BASE)
```

Replace `<Link href="/publications/authors/new">{t('addButton')}</Link>` with:

```tsx
          <Link href={paths.newAuthor}>{t('addButton')}</Link>
```

- [ ] **Step 2: `authors/new/page.tsx` — build its breadcrumb from the module and pass `basePath`**

Add the import:

```tsx
import { publicationsPaths, PUBLICATIONS_BASE } from '@/lib/publications/base-path'
```

Inside the component, before the `return`, add:

```tsx
  const paths = publicationsPaths(PUBLICATIONS_BASE)
```

Replace the breadcrumb link:

```tsx
            <Link href={paths.authorsList} className="hover:text-coral-600">{t('breadcrumbRoot')}</Link>
```

Pass the base path to the form:

```tsx
      <AddAuthorForm
        basePath={PUBLICATIONS_BASE}
        centres={centres.map((centre) => ({ value: centre.id, label: centre.name }))}
        users={users.map((user) => ({
          value: user.id,
          label: `${user.firstName ?? ''} ${user.lastName ?? ''} (${user.email})`.trim(),
        }))}
      />
```

- [ ] **Step 3: Create the admin author-creation page**

Create `app/[locale]/publications/admin/authors/new/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { canAdminApp } from '@/lib/permissions'
import { applicationLink } from '@/lib/application-link'
import { Link } from '@/app/i18n/navigation'
import { listCentres } from '@/lib/services/publications/centres'
import { listLinkableUsers } from '@/lib/services/publications/authors'
import { AddAuthorForm } from '@/app/[locale]/publications/components/add-author-form'
import { BackToDashboard } from '@/app/[locale]/publications/components/back-to-dashboard'
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function AdminNewAuthorPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
  const t = await getTranslations({ locale, namespace: 'publications.authors.add' })
  const [centres, users] = await Promise.all([listCentres(), listLinkableUsers()])
  const paths = publicationsPaths(PUBLICATIONS_ADMIN_BASE)

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <BackToDashboard locale={locale} />
      <div className="flex gap-4">
        <span aria-hidden className="mt-1 w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
        <div className="space-y-1">
          <nav className="text-sm text-text-muted">
            <Link href={paths.authorsList} className="hover:text-coral-600">{t('breadcrumbRoot')}</Link>
            <span className="text-text-muted"> › </span>
            <span className="text-text-secondary">{t('title')}</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('title')}</h1>
          <p className="text-sm text-text-secondary">{t('subtitle')}</p>
        </div>
      </div>
      <AddAuthorForm
        basePath={PUBLICATIONS_ADMIN_BASE}
        centres={centres.map((centre) => ({ value: centre.id, label: centre.name }))}
        users={users.map((user) => ({
          value: user.id,
          label: `${user.firstName ?? ''} ${user.lastName ?? ''} (${user.email})`.trim(),
        }))}
      />
    </div>
  )
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/publications/authors/page.tsx app/\[locale\]/publications/authors/new/page.tsx app/\[locale\]/publications/admin/authors/new/page.tsx
git commit -m "feat(publications): give the admin branch its own author-creation page"
```

---

### Task 5: `AuthorsManager` takes `basePath`

**Files:**
- Modify: `app/[locale]/publications/components/authors-manager.tsx`
- Modify: `app/[locale]/publications/admin/authors/page.tsx`

- [ ] **Step 1: `authors-manager.tsx`**

Add the import:

```tsx
import { publicationsPaths, type PublicationsBasePath } from '@/lib/publications/base-path'
```

Change the signature (line 96) to:

```tsx
export function AuthorsManager({ authors, users, centres, basePath }: { authors: AuthorListItem[]; users: LinkableUser[]; centres: { id: string; name: string; isOwn?: boolean }[]; basePath: PublicationsBasePath }) {
```

Immediately after `const router = useRouter()`, add:

```tsx
  const paths = publicationsPaths(basePath)
```

Replace the hardcoded link at line 277:

```tsx
            <Link href={paths.newAuthor}>
```

- [ ] **Step 2: `admin/authors/page.tsx` — pass the admin base**

Add the import:

```tsx
import { PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
```

Change the render to:

```tsx
      <AuthorsManager authors={authors} users={users} centres={centres} basePath={PUBLICATIONS_ADMIN_BASE} />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`AuthorsManager` is rendered only by the admin page — confirm with `grep -rn "AuthorsManager" --include="*.tsx" app/ | grep -v authors-manager.tsx`. If another render site exists, pass the base path matching its branch.)

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/publications/components/authors-manager.tsx app/\[locale\]/publications/admin/authors/page.tsx
git commit -m "feat(publications): keep the admin authors module inside the admin branch"
```

---

### Task 6: `ArticlePage` takes `basePath` instead of guessing

**Files:**
- Modify: `app/[locale]/publications/components/article/article-page.tsx`
- Modify: `app/[locale]/publications/articles/[id]/page.tsx`

- [ ] **Step 1: `article-page.tsx` — replace the role guess**

Add the import:

```tsx
import { PUBLICATIONS_ADMIN_BASE, type PublicationsBasePath } from '@/lib/publications/base-path'
```

Add `basePath` to the component's props. The signature becomes:

```tsx
export function ArticlePage({
  locale,
  article,
  options,
  viewer,
  basePath,
}: {
  locale: string
  article: PublicationEditData
  options: EditorOptions
  viewer: EditorViewer
  basePath: PublicationsBasePath
}) {
```

Replace the `backHref` line (line 69):

```tsx
  const backHref = basePath
```

Replace the breadcrumb label (line 140) so it follows the branch rather than the role:

```tsx
              {basePath === PUBLICATIONS_ADMIN_BASE ? t('adminHome.title') : t('title')}
```

Leave every other use of `viewer.isAdmin` untouched — the viewer's role still governs what they may edit.

- [ ] **Step 2: `articles/[id]/page.tsx` — pass the user base**

Add the import:

```tsx
import { PUBLICATIONS_BASE } from '@/lib/publications/base-path'
```

Add the prop to the render:

```tsx
    <ArticlePage
      locale={locale}
      article={article}
      options={{ journalTargets, studyOptions, journalNames, authorOptions }}
      viewer={{ userId: session.user.id, isFirstAuthor, isAdmin }}
      basePath={PUBLICATIONS_BASE}
    />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/publications/components/article/article-page.tsx app/\[locale\]/publications/articles/\[id\]/page.tsx
git commit -m "feat(publications): drive the article back link from the branch, not the role"
```

---

### Task 7: The admin article route

**Files:**
- Create: `app/[locale]/publications/admin/articles/[id]/page.tsx`

- [ ] **Step 1: Create the page**

It mirrors the user route, but guards on `canAdminApp` and sends a non-admin to the same article on the user branch, so a link shared by an administrator still works.

```tsx
import { redirect, notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp, canAdminApp } from '@/lib/permissions'
import { getPublicationForEdit, userIsFirstAuthor } from '@/lib/services/publications/publication-editor'
import { listJournalTargets } from '@/lib/services/publications/journal-targets'
import { listStudyOptions } from '@/lib/services/publications/studies'
import { listJournalNames } from '@/lib/services/publications/journals'
import { listAuthorOptions } from '@/lib/services/publications/authors'
import { ArticlePage } from '@/app/[locale]/publications/components/article/article-page'
import { publicationsPaths, PUBLICATIONS_BASE, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; id: string }> }

export default async function AdminArticleRoute({ params }: PageParams) {
  const { locale, id } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/dashboard'))
  if (!canAdminApp(session.user, 'PUBLICATIONS')) {
    redirect(applicationLink(locale, publicationsPaths(PUBLICATIONS_BASE).article(id)))
  }

  const article = await getPublicationForEdit(id)
  if (!article) notFound()

  const isFirstAuthor = await userIsFirstAuthor(session.user.id, id)

  const [journalTargets, studyOptions, journalNames, authorOptions] = await Promise.all([
    listJournalTargets(id),
    listStudyOptions(),
    listJournalNames(),
    listAuthorOptions(),
  ])

  return (
    <ArticlePage
      locale={locale}
      article={article}
      options={{ journalTargets, studyOptions, journalNames, authorOptions }}
      viewer={{ userId: session.user.id, isFirstAuthor, isAdmin: true }}
      basePath={PUBLICATIONS_ADMIN_BASE}
    />
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/publications/admin/articles/\[id\]/page.tsx
git commit -m "feat(publications): serve the article page from the admin branch too"
```

---

### Task 8: Point the admin entry points at the admin branch

**Files:**
- Modify: `app/[locale]/publications/components/articles/article-list-row.tsx`
- Modify: `app/[locale]/publications/components/admin-author-requests.tsx`
- Modify: `app/[locale]/publications/components/new-publication-button.tsx`

`ArticleListRow` and `AdminAuthorRequests` are rendered only by the admin dashboard, so they address the admin branch directly. `NewPublicationButton` already knows its side through its `asAdmin` prop.

- [ ] **Step 1: `article-list-row.tsx`**

Add the import:

```tsx
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
```

Above the `ArticleListRow` component, add the shared constant:

```tsx
const ADMIN_PATHS = publicationsPaths(PUBLICATIONS_ADMIN_BASE)
```

Replace the title link (line 93):

```tsx
              href={ADMIN_PATHS.article(article.id)}
```

Replace the pencil link (line 187):

```tsx
            href={ADMIN_PATHS.articleEdit(article.id)}
```

- [ ] **Step 2: `admin-author-requests.tsx`**

Add the import:

```tsx
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
```

Above the component, add:

```tsx
const ADMIN_PATHS = publicationsPaths(PUBLICATIONS_ADMIN_BASE)
```

Replace the link (line 46):

```tsx
                  href={ADMIN_PATHS.article(request.articleId)}
```

- [ ] **Step 3: `new-publication-button.tsx`**

Add the import:

```tsx
import { publicationsPaths, PUBLICATIONS_BASE, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
```

Replace the redirect (line 16) so it follows the branch the button belongs to:

```tsx
      if (data?.id) {
        const paths = publicationsPaths(asAdmin ? PUBLICATIONS_ADMIN_BASE : PUBLICATIONS_BASE)
        router.push(paths.articleEdit(data.id))
      }
```

- [ ] **Step 4: Type-check and confirm no hardcoded paths remain**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `grep -rn "'/publications/authors\|\"/publications/authors\|/publications/articles/\${" --include="*.tsx" app/\[locale\]/publications/components/`
Expected: no matches — every destination now comes from the module.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/publications/components/articles/article-list-row.tsx app/\[locale\]/publications/components/admin-author-requests.tsx app/\[locale\]/publications/components/new-publication-button.tsx
git commit -m "feat(publications): keep admin entry points on the admin branch"
```

---

### Task 9: E2E coverage for the branch separation

**Files:**
- Create: `tests/e2e/publications-branch-separation.spec.ts`

- [ ] **Step 1: Write the spec**

Two journeys: an administrator stays on the admin branch through the modules and the article page; a plain member stays on the user branch and a shared admin link still resolves for them.

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

test('an admin stays on the admin branch through the modules and the article page', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')

  // The Authors module keeps the admin prefix, including its "add author" page
  await page.goto('/en/publications/admin/authors', { timeout: 60000 })
  await page.getByRole('link', { name: /add an author/i }).click()
  await page.waitForURL(/\/en\/publications\/admin\/authors\/new/, { timeout: 30000 })

  // Opening an article from the dashboard keeps the admin prefix too
  await page.goto('/en/publications/admin', { timeout: 60000 })
  await page
    .getByRole('link', { name: /Outcomes of multi-valve intervention/i })
    .click()
  await page.waitForURL(/\/en\/publications\/admin\/articles\/[^/?]+$/, { timeout: 30000 })
  await expect(page.getByRole('link', { name: 'Publications dashboard', exact: true })).toBeVisible()
})

test('a member stays on the user branch and a shared admin link still resolves', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')

  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('link', { name: /Outcomes of multi-valve intervention/i }).first().click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/?]+$/, { timeout: 30000 })
  const userUrl = page.url()
  const articleId = userUrl.split('/articles/')[1]

  // The same article addressed on the admin branch bounces a non-admin back to their own branch
  await page.goto(`/en/publications/admin/articles/${articleId}`, { timeout: 60000 })
  await page.waitForURL(/\/en\/publications\/articles\/[^/?]+$/, { timeout: 30000 })
  await expect(page.getByRole('heading', { name: /Outcomes of multi-valve intervention/i })).toBeVisible()
})
```

- [ ] **Step 2: Run it**

Run: `npm run test:seed && PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/publications-branch-separation.spec.ts --reporter=line --workers=1`
Expected: 2 passed.

If a selector does not resolve (for instance the "add an author" link's accessible name differs from the English translation of `publications.authors.add.list.addButton`), read the actual label from `messages/en.json` and use it. Do not weaken an assertion to make a test pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/publications-branch-separation.spec.ts
git commit -m "test(publications): cover admin and user branch separation"
```

---

### Task 10: Full validation

**Files:** none (verification only)

- [ ] **Step 1: Run the full pre-push gate**

Run: `npm run verify:push`
Expected: PASS (unit, build, complete e2e suite).

- [ ] **Step 2: Fix any failure and rerun until green.** Do not weaken or delete a test to make this pass — fix the root cause.

Watch in particular for e2e specs that navigate the admin dashboard and then assert on an article URL: several already exist (`publications-admin-dashboard.spec.ts`, `publications-articles.spec.ts`, `publications-article-page.spec.ts`) and their expected URLs move from `/publications/articles/...` to `/publications/admin/articles/...` wherever the journey starts from the admin dashboard.

---

## Self-review

**Spec coverage:**
- `basePath` module with all destinations → Task 1.
- Shared components stop hardcoding paths → Tasks 2, 3, 5.
- `/publications/admin/authors/new` created → Task 4.
- `/publications/admin/articles/[id]` created, non-admins redirected to the user route → Task 7.
- `ArticlePage` stops guessing from `viewer.isAdmin` → Task 6.
- Admin entry points repointed → Task 8.
- Tests: unit for the module (Task 1), e2e for both branches and the shared link (Task 9), full gate (Task 10).
- Out of scope (other portal apps, the missing 404 page, permission changes) → nothing implements these.

**Placeholder scan:** none; every step carries literal code or an exact command.

**Type consistency:** `PublicationsBasePath`, `publicationsPaths`, `PUBLICATIONS_BASE` and `PUBLICATIONS_ADMIN_BASE` are defined once in Task 1 and imported by that same name everywhere after. The prop is called `basePath` in every component that receives it.
