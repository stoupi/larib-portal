# Single Article Page (merge detail + edit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `/publications/articles/[id]` (read-only detail) and `/publications/articles/[id]/edit` (full editor) into one route with a `read` / `edit` mode, per `docs/superpowers/specs/2026-08-06-publications-single-article-page-design.md`.

**Architecture:** The page keeps local `mode: 'read' | 'edit'` state, defaulting to `'read'`, flipped to `'edit'` by clicking "Edit" (rendered only when the server computed `canEdit = isAdmin || isFirstAuthor`) or by an initial `?mode=edit` query param (used right after creating a new draft, so the author lands straight in the empty form instead of a blank read view). A pure module (`lib/publications/editor-mode.ts`) turns `{ canEdit, mode }` into the three visibility flags every component needs. In read mode the page renders a new `ArticleReadingHeader` (title, badges, action bar, Edit button); in edit mode it renders the existing `EditorHeader` form. The six existing editor cards (`editor-authors`, `editor-authors-admin`, `editor-references`, `editor-submissions`, `editor-pdf`, `editor-journal-queue`) stay where they are, each gaining an `editable` prop that hides its mutation controls and renders static text/badges instead. A new `ArticleAbstractTimeline` component (abstract + editorial cycle) is always visible under the Authors card, in both modes. `articles/[id]/edit/` is deleted entirely, so it 404s.

**Tech Stack:** Next.js 15 App Router (server component page + client orchestrator), react-hook-form + zod (existing `FormSchema`), next-safe-action, next-intl, Prisma, Vitest, Playwright.

---

## Design notes locked in before implementation

1. **Route:** only `/publications/articles/[id]` survives. `app/[locale]/publications/articles/[id]/edit/` is deleted.
2. **`getPublicationForEdit`** (in `lib/services/publications/publication-editor.ts`) is extended, not renamed — it now feeds both modes of the single page.
3. **New files live in a new `components/article/` folder** (per spec), distinct from the existing `components/editor/` folder which keeps the six cards + `collapsible-card.tsx`.
4. **`EditorForm` / `EditorViewer` / `EditorOptions` types** currently exported from `components/editor/publication-editor.tsx` move to the new `components/article/article-page.tsx` (which replaces `publication-editor.tsx`). Every file importing them updates its import path.
5. **`EditorReferences` (PMID/DOI/study) stays edit-mode-content only when `editable` is true; it renders plain text when not** — the spec explicitly lists `editor-references` among the cards that persist into read mode with masked controls, so it is not just hidden.
6. **Affiliations under each author** (spec requirement) come from `authorship.affiliations` (existing `Affiliation`/`Centre` join, already used by the old detail page's `getArticle`), not from `author.centre` / `author.defaultAffiliation` (the single derived "place" `EditorAuthors` currently shows). The plan swaps the data source.
7. **`getArticle`, `ArticleDetail`, `ArticleStatusSelect`, `ArticleTypeSelect`** (only ever used by the old detail page) are deleted as dead code once the new page ships.

---

### Task 1: `editor-mode.ts` — pure visibility logic

**Files:**
- Create: `lib/publications/editor-mode.ts`
- Test: `lib/publications/editor-mode.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { computeEditorVisibility } from './editor-mode'

describe('computeEditorVisibility', () => {
  it('shows the Edit button only when the viewer can edit and is currently reading', () => {
    expect(computeEditorVisibility({ canEdit: true, mode: 'read' }).showEditButton).toBe(true)
    expect(computeEditorVisibility({ canEdit: true, mode: 'edit' }).showEditButton).toBe(false)
    expect(computeEditorVisibility({ canEdit: false, mode: 'read' }).showEditButton).toBe(false)
  })

  it('shows the save bar only in edit mode for a viewer who can edit', () => {
    expect(computeEditorVisibility({ canEdit: true, mode: 'edit' }).showSaveBar).toBe(true)
    expect(computeEditorVisibility({ canEdit: true, mode: 'read' }).showSaveBar).toBe(false)
    expect(computeEditorVisibility({ canEdit: false, mode: 'edit' }).showSaveBar).toBe(false)
  })

  it('mounts card controls only in edit mode for a viewer who can edit', () => {
    expect(computeEditorVisibility({ canEdit: true, mode: 'edit' }).cardsEditable).toBe(true)
    expect(computeEditorVisibility({ canEdit: true, mode: 'read' }).cardsEditable).toBe(false)
  })

  it('keeps a viewer without edit rights in read mode even if mode is forced to edit', () => {
    const visibility = computeEditorVisibility({ canEdit: false, mode: 'edit' })
    expect(visibility.showSaveBar).toBe(false)
    expect(visibility.cardsEditable).toBe(false)
    expect(visibility.showEditButton).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/publications/editor-mode.test.ts`
Expected: FAIL with "Cannot find module './editor-mode'"

- [ ] **Step 3: Write minimal implementation**

```ts
export type EditorMode = 'read' | 'edit'

export type EditorVisibility = {
  showEditButton: boolean
  showSaveBar: boolean
  cardsEditable: boolean
}

export function computeEditorVisibility({
  canEdit,
  mode,
}: {
  canEdit: boolean
  mode: EditorMode
}): EditorVisibility {
  const editing = canEdit && mode === 'edit'
  return {
    showEditButton: canEdit && mode === 'read',
    showSaveBar: editing,
    cardsEditable: editing,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/publications/editor-mode.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/publications/editor-mode.ts lib/publications/editor-mode.test.ts
git commit -m "feat(publications): add pure editor-mode visibility logic"
```

---

### Task 2: Extend `getPublicationForEdit` with abstract, editorial timeline and per-author affiliations

**Files:**
- Modify: `lib/services/publications/publication-editor.ts:86-134`

- [ ] **Step 1: Extend the select and drop the now-unused `centre`/`defaultAffiliation` fields**

Replace the `getPublicationForEdit` function body:

```ts
export async function getPublicationForEdit(articleId: string) {
  return prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      abstract: true,
      type: true,
      status: true,
      scope: true,
      studyId: true,
      pubmedId: true,
      doi: true,
      contributorsNote: true,
      pdfUrl: true,
      pdfKey: true,
      publishedAt: true,
      receivedAt: true,
      acceptedAt: true,
      reviewDelayDays: true,
      publishedJournal: { select: { name: true, abbreviation: true } },
      authorships: {
        orderBy: { order: 'asc' },
        select: {
          order: true,
          isCorresponding: true,
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              degrees: true,
              userId: true,
            },
          },
          affiliations: {
            orderBy: { order: 'asc' },
            select: { order: true, affiliation: { select: { centre: { select: { name: true } } } } },
          },
        },
      },
      submissions: {
        orderBy: { submittedAt: 'asc' },
        select: {
          id: true,
          submittedAt: true,
          status: true,
          decidedAt: true,
          journal: { select: { name: true, abbreviation: true } },
        },
      },
      authorRequests: { where: { status: 'PENDING' }, select: { id: true } },
    },
  })
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors in `editor-authors.tsx` referencing `author.centre` / `author.defaultAffiliation` — fixed in Task 4. No other errors.

- [ ] **Step 3: Commit**

```bash
git add lib/services/publications/publication-editor.ts
git commit -m "feat(publications): load abstract, editorial timeline and affiliations for the article page"
```

---

### Task 3: `EditorReferences` gains an `editable` prop

**Files:**
- Modify: `app/[locale]/publications/components/editor/editor-references.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import type { StudyOption } from '@/lib/services/publications/studies'
import type { EditorForm } from '../article/article-page'
import { CollapsibleCard } from './collapsible-card'

export function EditorReferences({
  form,
  studyOptions,
  editable,
}: {
  form: EditorForm
  studyOptions: StudyOption[]
  editable: boolean
}) {
  const t = useTranslations('publications')
  const pubmedId = form.watch('pubmedId')
  const doi = form.watch('doi')
  const studyId = form.watch('studyId')
  const studyLabel = studyOptions.find((option) => option.id === studyId)?.label ?? null

  return (
    <CollapsibleCard
      title={
        <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-coral-600">
          <span className="h-2 w-2 rounded-full bg-coral-500" />
          {t('editor.referencesTitle')}
        </span>
      }
    >
      <p className="text-sm text-text-secondary">{t('editor.referencesSubtitle')}</p>

      <div className="mt-4 space-y-3">
        <label className="grid grid-cols-[80px_1fr] items-center gap-3">
          <span className="text-sm font-semibold text-text-secondary">{t('editor.pmid')}</span>
          {editable ? (
            <Input {...form.register('pubmedId')} placeholder={t('editor.addPmid')} />
          ) : (
            <span className="text-sm text-text-primary">{pubmedId || '—'}</span>
          )}
        </label>
        <label className="grid grid-cols-[80px_1fr] items-center gap-3">
          <span className="text-sm font-semibold text-text-secondary">{t('editor.doi')}</span>
          {editable ? (
            <Input {...form.register('doi')} placeholder={t('editor.addDoi')} />
          ) : (
            <span className="text-sm text-text-primary">{doi || '—'}</span>
          )}
        </label>
        <label className="grid grid-cols-[80px_1fr] items-center gap-3">
          <span className="text-sm font-semibold text-text-secondary">{t('editor.linkedStudy')}</span>
          {editable ? (
            <select
              {...form.register('studyId')}
              className="h-10 rounded-lg border border-line bg-bg-surface px-3 text-sm text-text-primary outline-none focus:border-coral-400"
            >
              <option value="">{t('editor.selectStudy')}</option>
              {studyOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-text-primary">{studyLabel ?? '—'}</span>
          )}
        </label>
      </div>
    </CollapsibleCard>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/publications/components/editor/editor-references.tsx
git commit -m "feat(publications): render PMID/DOI/study as text when the references card is read-only"
```

(Import from `'../article/article-page'` will only resolve once Task 10 creates that file — that's expected; this task's commit lands alongside a temporarily-broken `EditorForm` import, which Task 10 fixes when it also updates `editor-authors.tsx` and `editor-header.tsx`. If you are executing tasks strictly in order and want every commit to type-check independently, do Task 3–9 edits together with Task 10 in one pass instead of committing Task 3 in isolation — call this out in the PR description if using subagent-per-task execution, and merge Tasks 3–10 into a single subagent dispatch.)

---

### Task 4: `EditorAuthors` gains `editable` + renders per-authorship affiliations

**Files:**
- Modify: `app/[locale]/publications/components/editor/editor-authors.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { UserPlus, Mail, Send, User } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'
import { requestAuthorListAction } from '../../actions'
import type { EditorForm, EditorViewer } from '../article/article-page'
import { CollapsibleCard } from './collapsible-card'

function degreeBadges(degrees: string | null): string[] {
  if (!degrees) return []
  return degrees
    .split(/[,;]/)
    .map((value) => value.trim())
    .filter(Boolean)
}

export function EditorAuthors({
  article,
  viewer,
  form,
  editable,
}: {
  article: PublicationEditData
  viewer: EditorViewer
  form: EditorForm
  editable: boolean
}) {
  const t = useTranslations('publications')
  const router = useRouter()
  const alreadyRequested = article.authorRequests.length > 0

  const request = useAction(requestAuthorListAction, {
    onSuccess() {
      toast.success(t('editor.requestSent'))
      router.refresh()
    },
    onError({ error }) {
      if (error.serverError === 'REQUEST_EXISTS') toast.error(t('editor.alreadyRequested'))
      else toast.error(t('editor.actionError'))
    },
  })

  return (
    <CollapsibleCard
      title={
        <>
          <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-coral-600">
            <span className="h-2 w-2 rounded-full bg-coral-500" />
            {t('editor.authorsTitle')}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-extrabold text-text-secondary tabular-nums dark:bg-white/10">
            {article.authorships.length}
          </span>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{t('editor.authorsManagedByAdmin')}</p>

      <ol className="mt-4 space-y-3">
        {article.authorships.map((authorship) => {
          const author = authorship.author
          const isYou = author.userId === viewer.userId
          const affiliationNames = authorship.affiliations
            .map((link) => link.affiliation.centre?.name ?? t('articles.noCentre'))
            .join(' · ')
          return (
            <li key={authorship.order} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[11px] font-bold text-text-secondary tabular-nums dark:bg-white/10">
                {authorship.order}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-text-primary">
                    {author.firstName} {author.lastName.toUpperCase()}
                  </span>
                  {degreeBadges(author.degrees).map((degree) => (
                    <span
                      key={degree}
                      className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-text-secondary dark:bg-white/10"
                    >
                      {degree}
                    </span>
                  ))}
                  {isYou && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-coral-100 bg-coral-50 px-2 py-0.5 text-[10.5px] font-bold text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300">
                      <User className="h-3 w-3" strokeWidth={2.4} />
                      {t('editor.you')}
                    </span>
                  )}
                  {authorship.isCorresponding && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-gray-50 px-2 py-0.5 text-[10.5px] font-bold text-text-secondary dark:bg-white/5">
                      <Mail className="h-3 w-3" strokeWidth={2.2} />
                      {t('editor.corresponding')}
                    </span>
                  )}
                </div>
                {authorship.affiliations.length > 0 && (
                  <span className="mt-0.5 block text-xs text-text-muted">{affiliationNames}</span>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {editable && (
        <div className="mt-5 border-t border-dashed border-line pt-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-coral-50 text-coral-500 dark:bg-coral-500/15 dark:text-coral-300">
              <UserPlus className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">{t('editor.contributorsLabel')}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{t('editor.contributorsHint')}</p>
            </div>
          </div>
          <Textarea
            {...form.register('contributorsNote')}
            rows={3}
            placeholder={t('editor.contributorsPlaceholder')}
            className="mt-3 resize-y"
          />
        </div>
      )}

      {editable && (
        <button
          type="button"
          disabled={alreadyRequested || request.isExecuting}
          onClick={() => request.execute({ articleId: article.id, note: form.getValues('contributorsNote').trim() || null })}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-coral-500 to-coral-600 text-sm font-bold text-white shadow-[0_8px_18px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105 disabled:opacity-60"
        >
          <Send className="h-4 w-4" strokeWidth={2.2} />
          {alreadyRequested ? t('editor.alreadyRequested') : t('editor.requestAuthorList')}
        </button>
      )}
    </CollapsibleCard>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/publications/components/editor/editor-authors.tsx
git commit -m "feat(publications): show per-author affiliations, gate contributor controls behind editable"
```

---

### Task 5: `EditorAuthorsAdmin` gains an `editable` prop

**Files:**
- Modify: `app/[locale]/publications/components/editor/editor-authors-admin.tsx`

- [ ] **Step 1: Add the prop and gate every mutation control**

In the function signature, add `editable` to the destructured props and its type:

```tsx
export function EditorAuthorsAdmin({
  articleId,
  initialAuthors,
  authorOptions,
  editable,
}: {
  articleId: string
  initialAuthors: AuthorshipEntry[]
  authorOptions: AuthorOption[]
  editable: boolean
}) {
```

Replace the `<li>` body so the four action buttons are replaced by a static corresponding badge when `!editable`:

```tsx
              <li
                key={entry.authorId}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[11px] font-bold text-text-secondary tabular-nums dark:bg-white/10">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
                  {option ? authorLabel(option) : entry.authorId}
                </span>
                {editable ? (
                  <>
                    <button
                      type="button"
                      title={t('markCorresponding')}
                      aria-label={`${t('markCorresponding')}: ${option ? authorLabel(option) : entry.authorId}`}
                      aria-pressed={entry.isCorresponding}
                      onClick={() =>
                        setEntries((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, isCorresponding: !item.isCorresponding } : item,
                          ),
                        )
                      }
                      className={cn(
                        'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition',
                        entry.isCorresponding
                          ? 'border-coral-200 bg-coral-50 text-coral-600 dark:border-coral-500/40 dark:bg-coral-500/15 dark:text-coral-300'
                          : 'border-line bg-bg-surface text-text-muted hover:bg-gray-50 dark:hover:bg-white/5',
                      )}
                    >
                      <Mail className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      title={t('moveUp')}
                      aria-label={`${t('moveUp')}: ${option ? authorLabel(option) : entry.authorId}`}
                      disabled={index === 0}
                      onClick={() => setEntries((current) => moveAuthorship(current, index, -1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-text-secondary transition hover:bg-gray-50 disabled:opacity-40 dark:hover:bg-white/5"
                    >
                      <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      title={t('moveDown')}
                      aria-label={`${t('moveDown')}: ${option ? authorLabel(option) : entry.authorId}`}
                      disabled={index === entries.length - 1}
                      onClick={() => setEntries((current) => moveAuthorship(current, index, 1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-text-secondary transition hover:bg-gray-50 disabled:opacity-40 dark:hover:bg-white/5"
                    >
                      <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      title={t('removeAuthor')}
                      aria-label={`${t('removeAuthor')}: ${option ? authorLabel(option) : entry.authorId}`}
                      onClick={() => setEntries((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                  </>
                ) : (
                  entry.isCorresponding && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-gray-50 px-2 py-0.5 text-[10.5px] font-bold text-text-secondary dark:bg-white/5">
                      <Mail className="h-3 w-3" strokeWidth={2.2} />
                      {t('markCorresponding')}
                    </span>
                  )
                )}
              </li>
```

Gate the add-author row and the save button:

```tsx
      {editable && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            value={pickedAuthorId}
            aria-label={t('selectAuthor')}
            onChange={(event) => setPickedAuthorId(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-bg-surface px-2.5 text-[13px] font-semibold text-text-primary outline-none focus:border-coral-400"
          >
            <option value="">{t('selectAuthor')}</option>
            {remaining.map((option) => (
              <option key={option.id} value={option.id}>
                {authorLabel(option)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addPickedAuthor}
            disabled={!pickedAuthorId}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-text-secondary transition hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            {t('addAuthor')}
          </button>
        </div>
      )}

      {editable && (
        <button
          type="button"
          disabled={save.isExecuting}
          onClick={() => save.execute({ articleId, authors: entries })}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-coral-500 to-coral-600 text-sm font-bold text-white shadow-[0_8px_18px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105 disabled:opacity-60"
        >
          <Save className="h-4 w-4" strokeWidth={2.2} />
          {t('saveAuthors')}
        </button>
      )}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/publications/components/editor/editor-authors-admin.tsx
git commit -m "feat(publications): gate admin author-list controls behind editable"
```

---

### Task 6: `EditorSubmissions` gains an `editable` prop

**Files:**
- Modify: `app/[locale]/publications/components/editor/editor-submissions.tsx`

- [ ] **Step 1: Add the prop, gate the add-form trigger and the status/edit/delete controls**

Add `editable: boolean` to the props destructuring and type.

Gate the `actions` prop passed to `CollapsibleCard` (the "Add a submission" button) — only pass it when `editable`:

```tsx
        actions={
          editable ? (
            <button
              type="button"
              onClick={() => setAddOpen((value) => !value)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-b from-coral-500 to-coral-600 px-3 text-xs font-bold text-white shadow-[0_6px_14px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
              {t('editor.addSubmission')}
            </button>
          ) : undefined
        }
```

Gate the `addOpen` form block itself (it can only ever be true if the button above was clickable, but guard anyway for safety):

```tsx
        {editable && addOpen && (
```

Replace the row-level status button + edit/delete icons with a read-only pill when `!editable`, keeping the editable branch identical to today:

```tsx
                        <div className="flex items-center gap-1.5">
                          {editable ? (
                            <div className="relative">
                              <button type="button" onClick={() => { setMenuId(menuId === row.id ? null : row.id); setPickStatus(null) }} className={cn(pillClassName(tone), 'cursor-pointer')}>
                                {t(`myPub.subStatus.${status}`)}
                                <ChevronDown className="h-3 w-3" strokeWidth={2.4} />
                              </button>
                              {menuId === row.id && (
                                <>
                                  <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)} />
                                  <div className="absolute right-0 top-[calc(100%+6px)] z-40 flex min-w-[210px] flex-col gap-0.5 rounded-xl border border-line bg-bg-surface p-2 shadow-elevation-lg">
                                    {pickStatus === null ? (
                                      SUBMISSION_STATUSES.map((option) => (
                                        <button key={option} type="button" disabled={setStatus.isExecuting} onClick={() => chooseStatus(row, option)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-text-primary transition hover:bg-gray-50 dark:hover:bg-white/5', option === status && 'bg-coral-50 dark:bg-coral-500/10')}>
                                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TONE_DOT_HEX[SUBMISSION_STATUS_TONE[option]] }} />
                                          <span className="flex-1 text-left">{t(`myPub.subStatus.${option}`)}</span>
                                          {option === status && <Check className="h-3.5 w-3.5 text-coral-600" strokeWidth={2.6} />}
                                        </button>
                                      ))
                                    ) : (
                                      <>
                                        <span className="px-1.5 pb-2 pt-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-text-muted">{t('myPub.dateFor', { status: t(`myPub.subStatus.${pickStatus}`) })}</span>
                                        <Input type="date" value={pickDate} onChange={(event) => setPickDate(event.target.value)} className="h-9" />
                                        <div className="mt-2.5 flex gap-2">
                                          <button type="button" onClick={() => setPickStatus(null)} className="h-9 flex-1 rounded-lg border border-line text-[12.5px] font-bold text-text-secondary">{t('myPub.back')}</button>
                                          <button type="button" disabled={!pickDate || setStatus.isExecuting} onClick={() => setStatus.execute({ submissionId: row.id, status: pickStatus, decidedAt: pickDate })} className="h-9 flex-1 rounded-lg bg-gradient-to-b from-navy-600 to-navy-700 text-[12.5px] font-bold text-white disabled:opacity-50">{t('myPub.confirm')}</button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className={pillClassName(tone)}>{t(`myPub.subStatus.${status}`)}</span>
                          )}
                          {editable && (
                            <>
                              <button type="button" onClick={() => openEdit(row)} title={t('editor.editSubmission')} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5">
                                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                              <button type="button" onClick={() => setDeleteId(row.id)} title={t('editor.deleteSubmission')} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-danger-600 transition hover:bg-danger-50 dark:hover:bg-white/5">
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                            </>
                          )}
                        </div>
```

Also wrap the `editId === row.id` inline-edit branch condition with `editable &&` so a stale `editId` can never render inputs in read mode:

```tsx
                    {editable && editId === row.id ? (
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/publications/components/editor/editor-submissions.tsx
git commit -m "feat(publications): gate submission edit/status/delete controls behind editable"
```

---

### Task 7: `EditorPdf` gains an `editable` prop

**Files:**
- Modify: `app/[locale]/publications/components/editor/editor-pdf.tsx`

- [ ] **Step 1: Add the prop and gate replace/remove/upload**

Add `editable: boolean` to the props. Replace the render branch:

```tsx
      <div className="space-y-3">
        {pdfUrl ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3.5">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-navy-600 underline-offset-4 hover:underline dark:text-navy-300"
            >
              <FileText className="h-4 w-4 shrink-0" strokeWidth={2.2} />
              <span className="truncate">{t('open')}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            </a>
            {editable && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-text-secondary transition hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/5"
                >
                  <Upload className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {t('replace')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove.execute({ id: articleId })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-white/5"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {t('remove')}
                </button>
              </div>
            )}
          </div>
        ) : editable ? (
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
        ) : (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-text-muted">{t('none')}</p>
        )}
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={onFileChange} />
      </div>
```

- [ ] **Step 2: Add the `none` translation key**

In `messages/en.json`, under `publications.editor.pdf`, add: `"none": "No PDF uploaded yet."`
In `messages/fr.json`, under `publications.editor.pdf`, add: `"none": "Aucun PDF pour le moment."`

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/publications/components/editor/editor-pdf.tsx messages/en.json messages/fr.json
git commit -m "feat(publications): gate PDF upload/replace/remove behind editable"
```

---

### Task 8: `ArticleAbstractTimeline` — new read-content component

**Files:**
- Create: `app/[locale]/publications/components/article/article-abstract-timeline.tsx`

- [ ] **Step 1: Write the component**

Ports the abstract + editorial-timeline sections from the old detail page verbatim, as a standalone card-less block (it sits directly in the left column, not inside a `CollapsibleCard`, matching the old page's plain `<section>` styling).

```tsx
import { useTranslations } from 'next-intl'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'

export function ArticleAbstractTimeline({ article, locale }: { article: PublicationEditData; locale: string }) {
  const t = useTranslations('publications')
  const formatDate = (date: Date) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)

  if (!article.receivedAt && !article.acceptedAt && !article.abstract) return null

  return (
    <div className="space-y-5 rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
      {(article.receivedAt || article.acceptedAt) && (
        <section className="space-y-2">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-coral-600">{t('articles.editorialTimeline')}</h2>
          <p className="text-sm text-text-secondary">
            {article.receivedAt ? `${t('articles.received')} ${formatDate(article.receivedAt)}` : null}
            {article.receivedAt && article.acceptedAt ? ' → ' : null}
            {article.acceptedAt ? `${t('articles.accepted')} ${formatDate(article.acceptedAt)}` : null}
            {article.reviewDelayDays != null ? (
              <span className="font-medium text-text-primary"> · {t('articles.reviewDelay', { days: article.reviewDelayDays })}</span>
            ) : null}
          </p>
        </section>
      )}

      {article.abstract && (
        <section className="space-y-2">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-coral-600">{t('articles.abstract')}</h2>
          <p className="whitespace-pre-line text-sm text-text-secondary">{article.abstract}</p>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/publications/components/article/article-abstract-timeline.tsx
git commit -m "feat(publications): add abstract and editorial timeline block to the article page"
```

---

### Task 9: `ArticleReadingHeader` — new read-mode header

**Files:**
- Create: `app/[locale]/publications/components/article/article-reading-header.tsx`

- [ ] **Step 1: Write the component**

Reuses the badge/pill styling already established in `editor-header.tsx` and `article-list-row.tsx`, plus the PubMed/DOI/PDF action-bar links from the old detail page.

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Pencil, FileText, ExternalLink } from 'lucide-react'
import { pillClassName, ARTICLE_STATUS_TONE } from '@/lib/publications/status-display'
import { ARTICLE_TYPE_BADGE } from '@/lib/publications/article-type'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'
import type { StudyOption } from '@/lib/services/publications/studies'
import { ArticleScopeSwitch } from '../articles/article-scope-switch'

export function ArticleReadingHeader({
  article,
  studyOptions,
  showEditButton,
  onEdit,
}: {
  article: PublicationEditData
  studyOptions: StudyOption[]
  showEditButton: boolean
  onEdit: () => void
}) {
  const t = useTranslations('publications')
  const tArticles = useTranslations('publications.articles')
  const studyLabel = studyOptions.find((option) => option.id === article.studyId)?.label ?? null
  const year = article.publishedAt ? new Date(article.publishedAt).getUTCFullYear() : null

  return (
    <div className="rounded-2xl border border-line bg-bg-surface p-6 shadow-elevation-xs">
      <div className="flex items-stretch gap-4">
        <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${ARTICLE_TYPE_BADGE[article.type]}`}
            >
              {t(`myPub.type.${article.type}`)}
            </span>
            <span className={pillClassName(ARTICLE_STATUS_TONE[article.status])}>{t(`articles.status.${article.status}`)}</span>
            <ArticleScopeSwitch articleId={article.id} articleTitle={article.title || t('myPub.untitled')} scope={article.scope} size="sm" />
            {year && <span className="text-sm font-bold text-text-secondary tabular-nums">{year}</span>}
            {studyLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-coral-100 bg-coral-50 px-3 py-1 text-[11.5px] font-bold text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300">
                {t('editor.studyChip', { study: studyLabel })}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-text-primary md:text-3xl">
            {article.title || t('myPub.untitled')}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {article.pubmedId && (
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${article.pubmedId}/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-navy-600 transition hover:bg-gray-50 dark:text-navy-300 dark:hover:bg-white/5"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} />
                {tArticles('openPubmed')}
              </a>
            )}
            {article.doi && (
              <a
                href={`https://doi.org/${article.doi}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-navy-600 transition hover:bg-gray-50 dark:text-navy-300 dark:hover:bg-white/5"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} />
                {tArticles('openDoi')}
              </a>
            )}
            {article.pdfUrl && (
              <a
                href={article.pdfUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-navy-600 transition hover:bg-gray-50 dark:text-navy-300 dark:hover:bg-white/5"
              >
                <FileText className="h-3.5 w-3.5" strokeWidth={2.2} />
                {tArticles('downloadPdf')}
              </a>
            )}
            {showEditButton && (
              <button
                type="button"
                onClick={onEdit}
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-b from-coral-500 to-coral-600 px-3.5 text-[13px] font-bold text-white shadow-[0_6px_14px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                {t('editor.editButton')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the `editor.editButton` translation key**

In `messages/en.json`, under `publications.editor`, add: `"editButton": "Edit"`
In `messages/fr.json`, under `publications.editor`, add: `"editButton": "Éditer"`

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/publications/components/article/article-reading-header.tsx messages/en.json messages/fr.json
git commit -m "feat(publications): add read-mode article header with action bar and Edit button"
```

---

### Task 10: `ArticlePage` orchestrator (replaces `publication-editor.tsx`)

**Files:**
- Create: `app/[locale]/publications/components/article/article-page.tsx`
- Delete: `app/[locale]/publications/components/editor/publication-editor.tsx`
- Modify: `app/[locale]/publications/components/editor/editor-header.tsx` (import path only)

- [ ] **Step 1: Create `article-page.tsx`**

This carries over `PublicationEditor`'s body (nav bar, `EditorHeader`, two-column layout, form/actions), switches the header by mode, threads `editable` into every card, and reads an optional `?mode=edit` search param.

```tsx
'use client'

import { useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Save, ChevronRight } from 'lucide-react'
import { Link, useRouter } from '@/app/i18n/navigation'
import { cn } from '@/lib/utils'
import { ARTICLE_STATUSES } from '@/lib/services/publications/articles'
import { ARTICLE_TYPE_VALUES, normalizeArticleType } from '@/lib/publications/article-type'
import { isDraftDeletable } from '@/lib/publications/editor-logic'
import { computeEditorVisibility, type EditorMode } from '@/lib/publications/editor-mode'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'
import type { JournalTargetItem } from '@/lib/services/publications/journal-targets'
import type { StudyOption } from '@/lib/services/publications/studies'
import type { AuthorOption } from '@/lib/services/publications/authors'
import { updateArticleCoreAction, deleteDraftArticleAction } from '../../actions'
import { EditorHeader } from '../editor/editor-header'
import { EditorAuthors } from '../editor/editor-authors'
import { EditorAuthorsAdmin } from '../editor/editor-authors-admin'
import { EditorReferences } from '../editor/editor-references'
import { EditorSubmissions } from '../editor/editor-submissions'
import { EditorJournalQueue } from '../editor/editor-journal-queue'
import { EditorPdf } from '../editor/editor-pdf'
import { ArticleReadingHeader } from './article-reading-header'
import { ArticleAbstractTimeline } from './article-abstract-timeline'

const FormSchema = z.object({
  title: z.string(),
  type: z.enum(ARTICLE_TYPE_VALUES),
  status: z.enum(ARTICLE_STATUSES),
  studyId: z.string(),
  pubmedId: z.string(),
  doi: z.string(),
  contributorsNote: z.string(),
})

export type EditorFormValues = z.infer<typeof FormSchema>
export type EditorForm = UseFormReturn<EditorFormValues>
export type EditorViewer = { userId: string; isFirstAuthor: boolean; isAdmin: boolean }

export type EditorOptions = {
  journalTargets: JournalTargetItem[]
  studyOptions: StudyOption[]
  journalNames: string[]
  authorOptions: AuthorOption[]
}

export function ArticlePage({
  locale,
  article,
  options,
  viewer,
}: {
  locale: string
  article: PublicationEditData
  options: EditorOptions
  viewer: EditorViewer
}) {
  const { journalTargets, studyOptions, journalNames, authorOptions } = options
  const t = useTranslations('publications')
  const router = useRouter()
  const searchParams = useSearchParams()
  const backHref = viewer.isAdmin ? '/publications/admin' : '/publications'
  const canEdit = viewer.isAdmin || viewer.isFirstAuthor

  const [mode, setMode] = useState<EditorMode>(searchParams.get('mode') === 'edit' ? 'edit' : 'read')
  const visibility = computeEditorVisibility({ canEdit, mode })

  const defaults: EditorFormValues = {
    title: article.title,
    type: normalizeArticleType(article.type),
    status: article.status,
    studyId: article.studyId ?? '',
    pubmedId: article.pubmedId ?? '',
    doi: article.doi ?? '',
    contributorsNote: article.contributorsNote ?? '',
  }
  const form = useForm<EditorFormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaults })
  const { isDirty } = form.formState

  const save = useAction(updateArticleCoreAction, {
    onSuccess() {
      toast.success(t('editor.saved'))
      form.reset(form.getValues())
      router.refresh()
    },
    onError() {
      toast.error(t('editor.actionError'))
    },
  })

  const removeDraft = useAction(deleteDraftArticleAction, {
    onSuccess() {
      toast.success(t('editor.deleted'))
      router.push(backHref)
    },
    onError() {
      toast.error(t('editor.actionError'))
    },
  })

  const onSave = form.handleSubmit((values) => {
    save.execute({
      id: article.id,
      title: values.title.trim(),
      type: values.type,
      status: values.status,
      studyId: values.studyId || null,
      pubmedId: values.pubmedId.trim() || null,
      doi: values.doi.trim() || null,
      contributorsNote: values.contributorsNote.trim() || null,
    })
  })

  function onDiscard() {
    if (isDirty) {
      form.reset(defaults)
      setMode('read')
      return
    }
    if (isDraftDeletable(article.title, article.status)) {
      removeDraft.execute({ id: article.id })
      return
    }
    setMode('read')
  }

  return (
    <div className="app-gradient min-h-full px-4 py-6 md:px-8">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap items-center gap-1.5 text-sm">
            <Link href={backHref} className="font-semibold text-text-secondary hover:underline">
              {viewer.isAdmin ? t('adminHome.title') : t('title')}
            </Link>
            <ChevronRight className="h-4 w-4 text-text-muted" />
            <span className="font-semibold text-text-primary">{article.title || t('myPub.untitled')}</span>
            {visibility.showSaveBar && isDirty && (
              <span className="ml-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#B45309] dark:text-[#FBBF24]">
                <span className="h-2 w-2 rounded-full bg-current" />
                {t('editor.unsavedChanges')}
              </span>
            )}
          </nav>
          {visibility.showSaveBar && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onDiscard}
                disabled={removeDraft.isExecuting}
                className="inline-flex h-11 items-center rounded-xl border border-line bg-bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5"
              >
                {t('editor.discard')}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={save.isExecuting || !isDirty}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-coral-500 to-coral-600 px-5 text-sm font-bold text-white shadow-[0_8px_18px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105 disabled:opacity-50"
              >
                <Save className="h-4 w-4" strokeWidth={2.2} />
                {t('editor.save')}
              </button>
            </div>
          )}
        </div>

        {visibility.showSaveBar ? (
          <EditorHeader article={article} viewer={viewer} form={form} studyOptions={studyOptions} />
        ) : (
          <ArticleReadingHeader
            article={article}
            studyOptions={studyOptions}
            showEditButton={visibility.showEditButton}
            onEdit={() => setMode('edit')}
          />
        )}

        <div className={cn('grid grid-cols-1 gap-5 lg:grid-cols-2')}>
          <div className="space-y-5">
            {viewer.isAdmin ? (
              <EditorAuthorsAdmin
                articleId={article.id}
                initialAuthors={article.authorships.map((authorship) => ({
                  authorId: authorship.author.id,
                  isCorresponding: authorship.isCorresponding,
                }))}
                authorOptions={authorOptions}
                editable={visibility.cardsEditable}
              />
            ) : (
              <EditorAuthors article={article} viewer={viewer} form={form} editable={visibility.cardsEditable} />
            )}
            <ArticleAbstractTimeline article={article} locale={locale} />
            <EditorReferences form={form} studyOptions={studyOptions} editable={visibility.cardsEditable} />
          </div>
          <div className="space-y-5">
            <EditorSubmissions
              articleId={article.id}
              submissions={article.submissions}
              locale={locale}
              journalNames={journalNames}
              editable={visibility.cardsEditable}
            />
            <EditorPdf articleId={article.id} pdfUrl={article.pdfUrl} editable={visibility.cardsEditable} />
            <EditorJournalQueue targets={journalTargets} />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Delete the old orchestrator**

```bash
git rm app/\[locale\]/publications/components/editor/publication-editor.tsx
```

- [ ] **Step 3: Update `editor-header.tsx`'s type import**

In `app/[locale]/publications/components/editor/editor-header.tsx`, change:

```tsx
import type { EditorForm, EditorViewer } from './publication-editor'
```

to:

```tsx
import type { EditorForm, EditorViewer } from '../article/article-page'
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: only the still-pending `articles/[id]/page.tsx` and `articles/[id]/edit/page.tsx` errors (fixed in Task 11), no other errors.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/publications/components/article/article-page.tsx app/\[locale\]/publications/components/editor/editor-header.tsx
git commit -m "feat(publications): add ArticlePage orchestrator with read/edit mode switch"
```

---

### Task 11: Rewrite the page route, delete `/edit`, delete dead code

**Files:**
- Modify: `app/[locale]/publications/articles/[id]/page.tsx`
- Delete: `app/[locale]/publications/articles/[id]/edit/page.tsx` (and the now-empty `edit/` directory)
- Delete: `app/[locale]/publications/components/article-status-select.tsx`
- Delete: `app/[locale]/publications/components/article-type-select.tsx`
- Modify: `lib/services/publications/articles.ts` (remove `getArticle`, `ArticleDetail`)

- [ ] **Step 1: Replace `articles/[id]/page.tsx`**

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

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; id: string }> }

export default async function ArticleRoute({ params }: PageParams) {
  const { locale, id } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/dashboard'))

  const article = await getPublicationForEdit(id)
  if (!article) notFound()

  const isAdmin = canAdminApp(session.user, 'PUBLICATIONS')
  const isFirstAuthor = await userIsFirstAuthor(session.user.id, id)

  const [journalTargets, studyOptions, journalNames, authorOptions] = await Promise.all([
    listJournalTargets(id),
    listStudyOptions(),
    listJournalNames(),
    isAdmin ? listAuthorOptions() : Promise.resolve([]),
  ])

  return (
    <ArticlePage
      locale={locale}
      article={article}
      options={{ journalTargets, studyOptions, journalNames, authorOptions }}
      viewer={{ userId: session.user.id, isFirstAuthor, isAdmin }}
    />
  )
}
```

- [ ] **Step 2: Delete the `/edit` route**

```bash
git rm app/\[locale\]/publications/articles/\[id\]/edit/page.tsx
rmdir "app/[locale]/publications/articles/[id]/edit" 2>/dev/null || true
```

- [ ] **Step 3: Delete the now-unused status/type select components**

```bash
git rm app/\[locale\]/publications/components/article-status-select.tsx
git rm app/\[locale\]/publications/components/article-type-select.tsx
```

- [ ] **Step 4: Remove `getArticle` and `ArticleDetail` from `lib/services/publications/articles.ts`**

Delete the `getArticle` function (lines 74-106 per the pre-change file) and its exported `ArticleDetail` type alias (the line reading `export type ArticleDetail = NonNullable<Awaited<ReturnType<typeof getArticle>>>` just above it, if present — confirm with `grep -n "ArticleDetail" lib/services/publications/articles.ts` before deleting to get the exact line).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/\[locale\]/publications/articles/\[id\]/page.tsx lib/services/publications/articles.ts
git commit -m "feat(publications): serve the merged article page from a single route, drop /edit"
```

---

### Task 12: Repoint every `/edit` link to the single route

**Files:**
- Modify: `app/[locale]/publications/components/new-publication-button.tsx:16`
- Modify: `app/[locale]/publications/components/publications-table.tsx:124,210`
- Modify: `app/[locale]/publications/components/articles/article-list-row.tsx:187`

- [ ] **Step 1: `new-publication-button.tsx`**

Change:

```tsx
      if (data?.id) router.push(`/publications/articles/${data.id}/edit`)
```

to:

```tsx
      if (data?.id) router.push(`/publications/articles/${data.id}?mode=edit`)
```

- [ ] **Step 2: `publications-table.tsx`**

At both line 124 and line 210, change:

```tsx
              href={item.isFirst ? `/publications/articles/${item.id}/edit` : `/publications/articles/${item.id}`}
```

to:

```tsx
              href={`/publications/articles/${item.id}`}
```

- [ ] **Step 3: `article-list-row.tsx`**

Change:

```tsx
            href={`/publications/articles/${article.id}/edit`}
```

to:

```tsx
            href={`/publications/articles/${article.id}?mode=edit`}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/publications/components/new-publication-button.tsx app/\[locale\]/publications/components/publications-table.tsx app/\[locale\]/publications/components/articles/article-list-row.tsx
git commit -m "feat(publications): point every edit entry point at the single article route"
```

---

### Task 13: Update existing e2e tests for the merged route

**Files:**
- Modify: `tests/e2e/publications-editor.spec.ts`
- Modify: `tests/e2e/publications-articles.spec.ts`

- [ ] **Step 1: `publications-editor.spec.ts` — wait for the new URL shape**

Change:

```ts
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL('**/edit', { timeout: 60000 })
```

to:

```ts
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/]+\?mode=edit/, { timeout: 60000 })
```

- [ ] **Step 2: `publications-articles.spec.ts` — enter edit mode via the button, not a `/edit` URL**

Change:

```ts
  // The admin edits the very article the co-authors see, PDF attachment included
  await page.goto(`${page.url()}/edit`, { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Full text (PDF)' })).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('Upload the article PDF')).toBeVisible()
```

to:

```ts
  // The admin edits the very article the co-authors see, PDF attachment included
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('heading', { name: 'Full text (PDF)' })).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('Upload the article PDF')).toBeVisible()
```

- [ ] **Step 3: Run both files**

Run: `npm run test:seed && PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/publications-editor.spec.ts tests/e2e/publications-articles.spec.ts --reporter=line --workers=1`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/publications-editor.spec.ts tests/e2e/publications-articles.spec.ts
git commit -m "test(publications): follow the merged article route in existing e2e flows"
```

---

### Task 14: New e2e coverage for read/edit visibility and the `/edit` 404

**Files:**
- Create: `tests/e2e/publications-article-page.spec.ts`

- [ ] **Step 1: Write the test file**

Covers the five scenarios from the spec's "Tests" section: read-only viewer sees content but no Edit button, first author edits and saves, Cancel discards, `/edit` 404s, and a co-author read view shows abstract/authors/affiliations/submissions.

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

test('a viewer without edit rights reads the article but cannot edit it', async ({ page }) => {
  await login(page, 'publications-coauthor@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('link', { name: /Outcomes of multi-valve intervention/i }).click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/?]+$/, { timeout: 30000 })

  await expect(page.getByRole('heading', { name: /Outcomes of multi-valve intervention/i })).toBeVisible()
  await expect(page.getByText(/Publications USER/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0)
})

test('the first author edits, cancels a change, then saves for real', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/]+\?mode=edit/, { timeout: 60000 })

  const originalTitle = `Draft ${Date.now()}`
  await page.getByPlaceholder('Publication title…').fill(originalTitle)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })

  await page.getByPlaceholder('Publication title…').fill(`${originalTitle} edited further`)
  await page.getByRole('button', { name: 'Discard' }).click()
  await expect(page.getByPlaceholder('Publication title…')).toHaveValue(originalTitle)

  const newTitle = `${originalTitle} final`
  await page.getByPlaceholder('Publication title…').fill(newTitle)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })

  await page.goto('/en/publications', { timeout: 60000 })
  await expect(page.getByText(newTitle)).toBeVisible({ timeout: 15000 })
})

test('the old /edit URL 404s', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin', { timeout: 60000 })
  const titleLink = page.getByRole('link', { name: /Outcomes of multi-valve intervention/i })
  await titleLink.click()
  await page.waitForURL(/\/en\/publications\/articles\/[^/?]+$/, { timeout: 30000 })

  await page.goto(`${page.url()}/edit`, { timeout: 60000 })
  await expect(page.getByText(/page could not be found|404/i)).toBeVisible({ timeout: 15000 })
})
```

- [ ] **Step 2: Confirm the fixture accounts referenced exist**

Run: `grep -n "publications-coauthor@larib-portal.test\|publications-user@larib-portal.test\|publications-admin@larib-portal.test" prisma/seed.test.ts`
Expected: all three emails present. If `publications-coauthor@larib-portal.test` does not exist, substitute the exact co-author seed email already used elsewhere in the suite (check `tests/e2e/publications.spec.ts` for the account used for "Jane COAUTHOR" and reuse it) and adjust the assertion text accordingly (`Jane COAUTHOR` is asserted as visible content, not as the login identity, so any account without admin/first-author rights on that article works for the first test).

- [ ] **Step 3: Run the new file**

Run: `npm run test:seed && PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/publications-article-page.spec.ts --reporter=line --workers=1`
Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/publications-article-page.spec.ts
git commit -m "test(publications): cover read/edit visibility and the /edit 404 on the merged article page"
```

---

### Task 15: Full validation

**Files:** none (verification only)

- [ ] **Step 1: Run the full pre-push gate**

Run: `npm run verify:push`
Expected: PASS (typecheck, unit tests, build, full e2e suite).

- [ ] **Step 2: Fix any failure and rerun until green.** Do not weaken or delete a test to make this pass — fix the root cause.

---

## Self-review

**Spec coverage:**
- Single route, `/edit` 404s → Task 11, 14 (Step 3 of task 14 asserts the 404).
- Read mode default, Edit button only when `canEdit` → `editor-mode.ts` (Task 1), `ArticlePage` (Task 10).
- Read mode renders values as content (title, type badge, status pill, scope pill) → `ArticleReadingHeader` (Task 9).
- Abstract, affiliations, editorial timeline survive in read mode → Task 8 (abstract/timeline), Task 4 (affiliations under each author).
- PubMed/DOI/PDF action bar visible in read mode → `ArticleReadingHeader` (Task 9).
- Everyone with app access sees submissions/journal queue, even without edit rights → `EditorSubmissions`/`EditorJournalQueue` always rendered, only their controls gated (Task 6; `EditorJournalQueue` never had controls, untouched).
- Main form (title/type/status/scope/study/PMID/DOI/contributors note) saved via "Enregistrer", "Annuler" restores initial values → unchanged `EditorHeader` + `ArticlePage.onSave`/`onDiscard` (Task 10).
- List/file cards keep immediate per-action save, controls mounted only in edit mode → Tasks 4–7.
- All `/edit` entry points repointed → Task 12.
- Tests: unit for `editor-mode.ts` (Task 1); e2e for read-only viewer, first-author edit/save, cancel, 404, admin flows still working (Tasks 13–14).
- Out of scope items (no concurrent-edit locking, no history, no redirect from `/edit`) → nothing implements these, consistent with the spec.

**Placeholder scan:** no TBD/TODO; every step has literal code or an exact command.

**Type consistency:** `EditorForm`/`EditorViewer`/`EditorOptions` defined once in `article-page.tsx` (Task 10) and imported everywhere else by that same path; `editable: boolean` prop name and `computeEditorVisibility`'s `cardsEditable` field are used consistently across every card (Tasks 4–7, 10).
