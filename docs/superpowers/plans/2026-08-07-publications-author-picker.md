# Author Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain `<select>` that composes an article's author list with a searchable picker dialog and a drag-ordered list, per `docs/superpowers/specs/2026-08-07-publications-author-picker-design.md`.

**Architecture:** Two pure modules hold the logic — `author-picker.ts` (search, tabs, sort, truncation) and `corresponding-author.ts` (single-corresponding-author rule) — so all the behaviour is unit-testable without a DOM. A new service query `listAuthorPickerOptions()` returns the whole author bank once (912 rows, small enough to filter client-side). Two new components render it: `AuthorPickerDialog` (search + tabs + sort + multi-select + inline creation) and `AuthorOrderList` (drag-ordered rows). `editor-authors-admin.tsx` keeps its local entries state and its save action, and becomes an orchestrator.

**Tech Stack:** Next.js 15 App Router, shadcn/ui (`Dialog`, `Tabs`, `Checkbox`, `Input`), `@dnd-kit/core` + `@dnd-kit/sortable` (new dependency), next-intl, next-safe-action, Vitest, Playwright.

---

## Design notes locked in before implementation

1. **Admin only.** `EditorAuthorsAdmin` is the only consumer. `EditorAuthors` (the first author's read view) is untouched — the first author still requests the list from an admin.
2. **`AuthorOption` is extended, not replaced.** `listAuthorOptions()` currently returns `{ id, firstName, lastName, centreId }` and is used by the studies pages too. The picker needs more fields, so a **separate** query `listAuthorPickerOptions()` is added and the existing one is left alone.
3. **Inline creation reuses `createAuthorAction`**, preserving its ORCID-blocks / name-warns duplicate detection. The centre is required in the picker's form (the action itself accepts an empty `centreIds`, so the requirement is enforced client-side by disabling submit).
4. **Ordering persists through the existing `setArticleAuthorsAction`** — unchanged. Only the interaction changes.
5. The card keeps **save-on-demand**: edits stay local until "Save the author list".

---

### Task 1: Search, tabs, sort and truncation

**Files:**
- Create: `lib/publications/author-picker.ts`
- Test: `lib/publications/author-picker.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import {
  matchesAuthorQuery,
  authorsForTab,
  sortAuthors,
  truncateAuthors,
  AUTHOR_PICKER_TABS,
  AUTHOR_PICKER_LIMIT,
  type PickerAuthor,
} from './author-picker'

function author(overrides: Partial<PickerAuthor> = {}): PickerAuthor {
  return {
    id: 'a1',
    firstName: 'Andreea Sorina',
    lastName: 'Afana',
    initials: 'AS',
    degrees: 'MD PhD',
    isOurTeam: true,
    centreName: 'Hôpital Lariboisière',
    publicationCount: 12,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('matchesAuthorQuery', () => {
  it('matches on last name, first name and initials, ignoring case', () => {
    expect(matchesAuthorQuery(author(), 'afana')).toBe(true)
    expect(matchesAuthorQuery(author(), 'ANDREEA')).toBe(true)
    expect(matchesAuthorQuery(author(), 'as')).toBe(true)
  })

  it('matches on the centre name, ignoring accents', () => {
    expect(matchesAuthorQuery(author(), 'lariboisiere')).toBe(true)
    expect(matchesAuthorQuery(author(), 'Lariboisière')).toBe(true)
  })

  it('rejects what is nowhere in the record, and accepts an empty query', () => {
    expect(matchesAuthorQuery(author(), 'zzz')).toBe(false)
    expect(matchesAuthorQuery(author(), '   ')).toBe(true)
  })

  it('tolerates a missing centre or initials', () => {
    const sparse = author({ centreName: null, initials: null })
    expect(matchesAuthorQuery(sparse, 'afana')).toBe(true)
    expect(matchesAuthorQuery(sparse, 'lariboisiere')).toBe(false)
  })
})

describe('authorsForTab', () => {
  const team = author({ id: 'team', isOurTeam: true, publicationCount: 1, createdAt: '2020-01-01T00:00:00.000Z' })
  const prolific = author({ id: 'prolific', isOurTeam: false, publicationCount: 99, createdAt: '2021-01-01T00:00:00.000Z' })
  const fresh = author({ id: 'fresh', isOurTeam: false, publicationCount: 0, createdAt: '2026-08-01T00:00:00.000Z' })
  const bank = [team, prolific, fresh]

  it('keeps only our team on the team tab', () => {
    expect(authorsForTab(bank, 'team').map((entry) => entry.id)).toEqual(['team'])
  })

  it('ranks the frequent tab by publication count', () => {
    expect(authorsForTab(bank, 'frequent')[0].id).toBe('prolific')
  })

  it('ranks the recent tab by creation date, newest first', () => {
    expect(authorsForTab(bank, 'recent')[0].id).toBe('fresh')
  })

  it('returns everyone on the all tab', () => {
    expect(authorsForTab(bank, 'all')).toHaveLength(3)
  })

  it('exposes the four tabs in display order', () => {
    expect(AUTHOR_PICKER_TABS).toEqual(['team', 'frequent', 'recent', 'all'])
  })
})

describe('sortAuthors', () => {
  const low = author({ id: 'low', lastName: 'Zulu', publicationCount: 2 })
  const high = author({ id: 'high', lastName: 'Alpha', publicationCount: 40 })

  it('orders by publication count when sorting by frequency', () => {
    expect(sortAuthors([low, high], 'frequent').map((entry) => entry.id)).toEqual(['high', 'low'])
  })

  it('orders by last name when sorting alphabetically', () => {
    expect(sortAuthors([low, high], 'alphabetical').map((entry) => entry.id)).toEqual(['high', 'low'])
  })
})

describe('truncateAuthors', () => {
  const many = Array.from({ length: AUTHOR_PICKER_LIMIT + 7 }, (_unused, index) =>
    author({ id: `a${index}` }),
  )

  it('caps the visible rows and reports the remainder', () => {
    const { visible, hiddenCount } = truncateAuthors(many)
    expect(visible).toHaveLength(AUTHOR_PICKER_LIMIT)
    expect(hiddenCount).toBe(7)
  })

  it('reports nothing hidden for a short list', () => {
    expect(truncateAuthors([author()])).toEqual({ visible: [author()], hiddenCount: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/publications/author-picker.test.ts`
Expected: FAIL with "Cannot find module './author-picker'"

- [ ] **Step 3: Write the implementation**

```ts
export type PickerAuthor = {
  id: string
  firstName: string
  lastName: string
  initials: string | null
  degrees: string | null
  isOurTeam: boolean
  centreName: string | null
  publicationCount: number
  createdAt: string
}

export const AUTHOR_PICKER_TABS = ['team', 'frequent', 'recent', 'all'] as const
export type AuthorPickerTab = (typeof AUTHOR_PICKER_TABS)[number]

export type AuthorSort = 'frequent' | 'alphabetical'

export const AUTHOR_PICKER_LIMIT = 50
const SHORTLIST_SIZE = 20

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function matchesAuthorQuery(author: PickerAuthor, query: string): boolean {
  const needle = normalize(query.trim())
  if (needle === '') return true
  const haystack = normalize(
    [author.firstName, author.lastName, author.initials ?? '', author.centreName ?? ''].join(' '),
  )
  return haystack.includes(needle)
}

export function sortAuthors(authors: PickerAuthor[], sort: AuthorSort): PickerAuthor[] {
  const sorted = [...authors]
  if (sort === 'frequent') {
    sorted.sort((first, second) => second.publicationCount - first.publicationCount)
    return sorted
  }
  sorted.sort((first, second) => first.lastName.localeCompare(second.lastName))
  return sorted
}

export function authorsForTab(authors: PickerAuthor[], tab: AuthorPickerTab): PickerAuthor[] {
  if (tab === 'team') return authors.filter((author) => author.isOurTeam)
  if (tab === 'frequent') return sortAuthors(authors, 'frequent').slice(0, SHORTLIST_SIZE)
  if (tab === 'recent') {
    return [...authors]
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
      .slice(0, SHORTLIST_SIZE)
  }
  return authors
}

export function truncateAuthors(authors: PickerAuthor[]): { visible: PickerAuthor[]; hiddenCount: number } {
  return {
    visible: authors.slice(0, AUTHOR_PICKER_LIMIT),
    hiddenCount: Math.max(0, authors.length - AUTHOR_PICKER_LIMIT),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/publications/author-picker.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/publications/author-picker.ts lib/publications/author-picker.test.ts
git commit -m "feat(publications): pure search, tab and sort logic for the author picker"
```

---

### Task 2: The single-corresponding-author rule

**Files:**
- Create: `lib/publications/corresponding-author.ts`
- Test: `lib/publications/corresponding-author.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { markCorresponding } from './corresponding-author'

const entries = [
  { authorId: 'a', isCorresponding: false },
  { authorId: 'b', isCorresponding: true },
  { authorId: 'c', isCorresponding: false },
]

describe('markCorresponding', () => {
  it('moves the mark to the chosen author and clears the previous one', () => {
    expect(markCorresponding(entries, 'c')).toEqual([
      { authorId: 'a', isCorresponding: false },
      { authorId: 'b', isCorresponding: false },
      { authorId: 'c', isCorresponding: true },
    ])
  })

  it('clears the mark when the current corresponding author is picked again', () => {
    expect(markCorresponding(entries, 'b').every((entry) => !entry.isCorresponding)).toBe(true)
  })

  it('leaves the list untouched when the author is absent', () => {
    expect(markCorresponding(entries, 'zzz')).toEqual(entries)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/publications/corresponding-author.test.ts`
Expected: FAIL with "Cannot find module './corresponding-author'"

- [ ] **Step 3: Write the implementation**

```ts
import type { AuthorshipEntry } from './author-list'

export function markCorresponding(entries: AuthorshipEntry[], authorId: string): AuthorshipEntry[] {
  if (!entries.some((entry) => entry.authorId === authorId)) return entries
  const wasCorresponding = entries.some(
    (entry) => entry.authorId === authorId && entry.isCorresponding,
  )
  return entries.map((entry) => ({
    ...entry,
    isCorresponding: !wasCorresponding && entry.authorId === authorId,
  }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/publications/corresponding-author.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/publications/corresponding-author.ts lib/publications/corresponding-author.test.ts
git commit -m "feat(publications): one corresponding author at a time"
```

---

### Task 3: The picker query

**Files:**
- Modify: `lib/services/publications/authors.ts`

- [ ] **Step 1: Add `listAuthorPickerOptions` next to the existing `listAuthorOptions`**

Leave `listAuthorOptions` and its `AuthorOption` type exactly as they are — the studies pages still use them. Add below:

```ts
export type AuthorPickerOption = {
  id: string
  firstName: string
  lastName: string
  initials: string | null
  degrees: string | null
  isOurTeam: boolean
  centreName: string | null
  publicationCount: number
  createdAt: string
}

export async function listAuthorPickerOptions(): Promise<AuthorPickerOption[]> {
  const authors = await prisma.author.findMany({
    orderBy: [{ lastName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      initials: true,
      degrees: true,
      type: true,
      createdAt: true,
      centre: { select: { name: true } },
      _count: { select: { authorships: true } },
    },
  })
  return authors.map((author) => ({
    id: author.id,
    firstName: author.firstName,
    lastName: author.lastName,
    initials: author.initials,
    degrees: author.degrees,
    isOurTeam: author.type === 'OUR_TEAM',
    centreName: author.centre?.name ?? null,
    publicationCount: author._count.authorships,
    createdAt: author.createdAt.toISOString(),
  }))
}
```

`createdAt` is serialised to a string so the value crosses the server/client boundary cleanly and matches `PickerAuthor` from Task 1.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/services/publications/authors.ts
git commit -m "feat(publications): query the author bank for the picker"
```

---

### Task 4: Install the drag-and-drop dependency

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

Run: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

- [ ] **Step 2: Verify the build still works**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add dnd-kit for author list ordering"
```

---

### Task 5: Translations for the picker

**Files:**
- Modify: `messages/en.json`, `messages/fr.json`

- [ ] **Step 1: Add the keys**

Inside the existing `publications.editor` object in `messages/en.json`, add a nested `picker` object:

```json
"picker": {
  "title": "Add authors",
  "subtitle": "Search your author bank by name or centre — {count} authors available.",
  "searchPlaceholder": "Name, initials or centre…",
  "searchLabel": "Search the author bank",
  "tabTeam": "Our team",
  "tabFrequent": "Frequent",
  "tabRecent": "Recent",
  "tabAll": "All",
  "sortLabel": "Sort",
  "sortFrequent": "Most frequent",
  "sortAlphabetical": "A–Z",
  "added": "Added",
  "publicationCount": "{count} pubs",
  "moreHidden": "{count} more — keep typing to narrow",
  "empty": "No author matches this search.",
  "selectionHint": "Select one or more authors",
  "selectedCount": "{count} selected",
  "confirm": "Add authors",
  "cancel": "Cancel",
  "newAuthor": "New author",
  "firstName": "First name",
  "lastName": "Last name",
  "centrePlaceholder": "Search your centre bank — name or city",
  "centreRequired": "Pick a centre to create the author.",
  "ourTeam": "Our team",
  "create": "Create & select",
  "created": "Author created",
  "duplicateWarning": "An author with a close name already exists. Create anyway?",
  "duplicateBlocked": "An author with this ORCID already exists."
},
"order": {
  "hint": "Drag the rows to set the author order, and use the mail icon to mark the corresponding author.",
  "corresponding": "Corresponding",
  "markCorresponding": "Mark as corresponding",
  "remove": "Remove author",
  "reorder": "Reorder author"
}
```

The French mirror in `messages/fr.json`:

```json
"picker": {
  "title": "Ajouter des auteurs",
  "subtitle": "Cherchez dans votre banque d'auteurs par nom ou centre — {count} auteurs disponibles.",
  "searchPlaceholder": "Nom, initiales ou centre…",
  "searchLabel": "Chercher dans la banque d'auteurs",
  "tabTeam": "Notre équipe",
  "tabFrequent": "Fréquents",
  "tabRecent": "Récents",
  "tabAll": "Tous",
  "sortLabel": "Trier",
  "sortFrequent": "Les plus fréquents",
  "sortAlphabetical": "A–Z",
  "added": "Ajouté",
  "publicationCount": "{count} publis",
  "moreHidden": "{count} de plus — affinez la recherche",
  "empty": "Aucun auteur ne correspond à cette recherche.",
  "selectionHint": "Sélectionnez un ou plusieurs auteurs",
  "selectedCount": "{count} sélectionné(s)",
  "confirm": "Ajouter les auteurs",
  "cancel": "Annuler",
  "newAuthor": "Nouvel auteur",
  "firstName": "Prénom",
  "lastName": "Nom",
  "centrePlaceholder": "Cherchez dans votre banque de centres — nom ou ville",
  "centreRequired": "Choisissez un centre pour créer l'auteur.",
  "ourTeam": "Notre équipe",
  "create": "Créer et sélectionner",
  "created": "Auteur créé",
  "duplicateWarning": "Un auteur au nom proche existe déjà. Créer quand même ?",
  "duplicateBlocked": "Un auteur avec cet ORCID existe déjà."
},
"order": {
  "hint": "Glissez les lignes pour définir l'ordre des auteurs, et utilisez l'icône enveloppe pour marquer l'auteur correspondant.",
  "corresponding": "Correspondant",
  "markCorresponding": "Marquer comme correspondant",
  "remove": "Retirer l'auteur",
  "reorder": "Réordonner l'auteur"
}
```

- [ ] **Step 2: Verify both files parse**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/fr.json
git commit -m "i18n(publications): wording for the author picker and ordered list"
```

---

### Task 6: `AuthorPickerDialog`

**Files:**
- Create: `app/[locale]/publications/components/authors/author-picker-dialog.tsx`

- [ ] **Step 1: Build the dialog**

It owns: the search query, the active tab, the sort, the pending selection, and the inline-creation panel. It never mutates the article — it hands the chosen author ids back through `onConfirm`.

Use the existing shadcn primitives (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `Input`, `Checkbox`) and the pure helpers from Task 1. Compose the visible rows as:

```tsx
const tabAuthors = authorsForTab(authors, tab)
const matching = tabAuthors.filter((author) => matchesAuthorQuery(author, query))
const { visible, hiddenCount } = truncateAuthors(sortAuthors(matching, sort))
```

Requirements to satisfy:
- The dialog body scrolls independently; the header (search, tabs, sort) and the footer (hint, Cancel, confirm) stay put. Follow the pattern already used for the study-import dialog: `DialogContent` gets `flex max-h-[90vh] flex-col overflow-hidden`, the scrolling region gets `min-h-0 flex-1 overflow-y-auto`.
- An author whose id is in `alreadyAddedIds` renders a static "Added" pill instead of a checkbox and is not selectable.
- When `hiddenCount > 0`, render `t('picker.moreHidden', { count: hiddenCount })` at the end of the list.
- When `visible.length === 0`, render `t('picker.empty')`.
- The confirm button is disabled while nothing is selected, and its label is `t('picker.confirm')`; the footer shows `t('picker.selectedCount', { count })` once at least one row is ticked, otherwise `t('picker.selectionHint')`.
- The inline creation panel takes first name, last name, a centre search over the `centres` prop, and an "Our team" checkbox. Submit stays disabled until first name, last name and a centre are all set (`t('picker.centreRequired')` explains why). It calls `createAuthorAction`; on `status: 'blocked'` show `t('picker.duplicateBlocked')`, on `status: 'warning'` show `t('picker.duplicateWarning')` with a confirm button that re-submits with `confirmDuplicate: true`, on `status: 'created'` toast `t('picker.created')`, add the new author to the local list and tick it.

Props:

```tsx
export function AuthorPickerDialog({
  open,
  onOpenChange,
  authors,
  centres,
  alreadyAddedIds,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  authors: PickerAuthor[]
  centres: { id: string; name: string; city: string | null }[]
  alreadyAddedIds: string[]
  onConfirm: (authorIds: string[]) => void
})
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/publications/components/authors/author-picker-dialog.tsx
git commit -m "feat(publications): searchable author picker dialog with inline creation"
```

---

### Task 7: `AuthorOrderList`

**Files:**
- Create: `app/[locale]/publications/components/authors/author-order-list.tsx`

- [ ] **Step 1: Build the ordered list**

A `DndContext` + `SortableContext` (vertical list strategy) over the entries. Each row is a `useSortable` item showing: the drag handle (the `listeners`/`attributes` go on the handle, not the whole row, so the buttons stay clickable), the 1-based rank, the author's initials in a round badge, `Firstname LASTNAME`, the degrees, an "OUR TEAM" badge when `isOurTeam`, the centre name underneath, a "CORRESPONDING" badge when marked, then the mail / remove buttons.

Props:

```tsx
export function AuthorOrderList({
  entries,
  authorsById,
  onReorder,
  onToggleCorresponding,
  onRemove,
}: {
  entries: AuthorshipEntry[]
  authorsById: Map<string, PickerAuthor>
  onReorder: (entries: AuthorshipEntry[]) => void
  onToggleCorresponding: (authorId: string) => void
  onRemove: (authorId: string) => void
})
```

`onDragEnd` computes the new order with `arrayMove` from `@dnd-kit/sortable` and calls `onReorder`. Keyboard accessibility comes free from dnd-kit's `KeyboardSensor` — register `PointerSensor` and `KeyboardSensor` via `useSensors`, and give the handle an `aria-label` of `t('order.reorder')`.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/publications/components/authors/author-order-list.tsx
git commit -m "feat(publications): drag-ordered author list"
```

---

### Task 8: Wire both into `EditorAuthorsAdmin`

**Files:**
- Modify: `app/[locale]/publications/components/editor/editor-authors-admin.tsx`
- Modify: `app/[locale]/publications/components/article/article-page.tsx`
- Modify: `app/[locale]/publications/articles/[id]/page.tsx`
- Modify: `app/[locale]/publications/admin/articles/[id]/page.tsx`

- [ ] **Step 1: Feed the new data through the page**

Both article routes already call `listAuthorOptions()`. Add the picker query and the centre list alongside it. In each route file, import `listAuthorPickerOptions` and `listCentres`, add them to the existing `Promise.all`, and pass them into `options`:

```tsx
  const [journalTargets, studyOptions, journalNames, authorOptions, pickerAuthors, centres] = await Promise.all([
    listJournalTargets(id),
    listStudyOptions(),
    listJournalNames(),
    isAdmin ? listAuthorOptions() : Promise.resolve([]),
    isAdmin ? listAuthorPickerOptions() : Promise.resolve([]),
    isAdmin ? listCentres() : Promise.resolve([]),
  ])
```

(In `admin/articles/[id]/page.tsx` the viewer is always an admin, so call the three queries unconditionally.)

Extend `EditorOptions` in `article-page.tsx`:

```tsx
export type EditorOptions = {
  journalTargets: JournalTargetItem[]
  studyOptions: StudyOption[]
  journalNames: string[]
  authorOptions: AuthorOption[]
  pickerAuthors: PickerAuthor[]
  centres: { id: string; name: string; city: string | null }[]
}
```

and pass the two new values down to `EditorAuthorsAdmin`.

- [ ] **Step 2: Rewrite the card body**

`EditorAuthorsAdmin` keeps `entries` state, the `save` action and the `editable` gate. Replace the `<select>` + add button with a single "Add authors" button that opens `AuthorPickerDialog`, and replace the `<ol>` with `AuthorOrderList`. Its handlers:

```tsx
  const authorsById = useMemo(
    () => new Map(pickerAuthors.map((author) => [author.id, author])),
    [pickerAuthors],
  )

  function addAuthors(authorIds: string[]) {
    setEntries((current) => [
      ...current,
      ...authorIds
        .filter((authorId) => !current.some((entry) => entry.authorId === authorId))
        .map((authorId) => ({ authorId, isCorresponding: false })),
    ])
  }

  function toggleCorresponding(authorId: string) {
    setEntries((current) => markCorresponding(current, authorId))
  }

  function removeAuthor(authorId: string) {
    setEntries((current) => current.filter((entry) => entry.authorId !== authorId))
  }
```

In read mode (`editable === false`) the "Add authors" button, the drag handles and the row buttons are not mounted — the list renders as static rows, exactly as the card does today.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/publications/components/editor/editor-authors-admin.tsx app/\[locale\]/publications/components/article/article-page.tsx app/\[locale\]/publications/articles/\[id\]/page.tsx app/\[locale\]/publications/admin/articles/\[id\]/page.tsx
git commit -m "feat(publications): compose the author list with the picker and drag ordering"
```

---

### Task 9: E2E coverage

**Files:**
- Create: `tests/e2e/publications-author-picker.spec.ts`

- [ ] **Step 1: Write the spec**

One comprehensive admin journey plus one creation journey.

```ts
import { test, expect, type Page } from '@playwright/test'

test.setTimeout(120000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

async function openSeededArticleInEditMode(page: Page): Promise<void> {
  await page.goto('/en/publications/admin', { timeout: 60000 })
  await page.getByRole('link', { name: /Outcomes of multi-valve intervention/i }).click()
  await page.waitForURL(/\/en\/publications\/admin\/articles\/[^/?]+$/, { timeout: 30000 })
  await page.getByRole('button', { name: 'Edit' }).click()
}

test('an admin searches the bank, adds authors, reorders and marks the corresponding one', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await openSeededArticleInEditMode(page)

  await page.getByRole('button', { name: 'Add authors' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Searching narrows the bank, and an author already on the article cannot be added twice
  await dialog.getByLabel('Search the author bank').fill('coauthor')
  await expect(dialog.getByText('Added').first()).toBeVisible({ timeout: 15000 })

  await dialog.getByLabel('Search the author bank').fill('zzz-nobody')
  await expect(dialog.getByText('No author matches this search.')).toBeVisible()

  await dialog.getByLabel('Search the author bank').fill('')
  await dialog.getByRole('tab', { name: 'All' }).click()
  const firstSelectable = dialog.locator('input[type="checkbox"]:not(:disabled)').first()
  await firstSelectable.check()
  await dialog.getByRole('button', { name: 'Add authors', exact: true }).click()
  await expect(dialog).toBeHidden({ timeout: 15000 })

  // Marking a corresponding author is exclusive: only one badge survives
  await page.getByRole('button', { name: /Mark as corresponding/ }).first().click()
  await expect(page.getByText('CORRESPONDING')).toHaveCount(1)

  await page.getByRole('button', { name: 'Save the author list' }).click()
  await expect(page.getByText('Author list updated')).toBeVisible({ timeout: 20000 })

  await page.reload()
  await expect(page.getByText('CORRESPONDING')).toHaveCount(1)
})

test('an admin creates an author from the dialog and is warned about a close name', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await openSeededArticleInEditMode(page)

  await page.getByRole('button', { name: 'Add authors' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'New author' }).click()

  // A name that already exists in the bank triggers the duplicate warning
  await dialog.getByLabel('First name').fill('Jane')
  await dialog.getByLabel('Last name').fill('Coauthor')
  await dialog.getByPlaceholder('Search your centre bank — name or city').fill('Lariboisière')
  await dialog.getByText('Lariboisière Hospital').first().click()
  await dialog.getByRole('button', { name: 'Create & select' }).click()
  await expect(dialog.getByText('An author with a close name already exists. Create anyway?')).toBeVisible({ timeout: 15000 })
})
```

- [ ] **Step 2: Run it**

Run: `npm run test:seed && PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/publications-author-picker.spec.ts --reporter=line --workers=1`
Expected: 2 passed.

Selectors are best-effort: adjust them to the markup you actually built (read the accessible names from your components and `messages/en.json`), but do NOT weaken what is being asserted — the search must narrow, the "Added" state must block a duplicate add, the corresponding badge must be exclusive and must survive a reload, and the duplicate warning must appear.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/publications-author-picker.spec.ts
git commit -m "test(publications): cover the author picker and the ordered list"
```

---

### Task 10: Full validation

**Files:** none (verification only)

- [ ] **Step 1: Run the full pre-push gate**

Run: `npm run verify:push`
Expected: PASS (unit, build, complete e2e suite).

- [ ] **Step 2: Fix any failure and rerun until green.** Do not weaken or delete a test to make this pass — fix the root cause.

Expect fallout in `publications-admin-dashboard.spec.ts`, which drives the old author controls (it selects an author through the `Select an author` combobox and clicks `Add an author`). Those steps must be rewritten against the dialog. The seeded author names it relies on are unchanged.

---

## Self-review

**Spec coverage:**
- Search by name / initials / centre, accent- and case-insensitive → Task 1.
- Four tabs with their counts, two sorts → Tasks 1 and 6.
- Multi-select with an "Added" state for authors already on the article → Task 6.
- Truncation notice past 50 rows → Tasks 1 and 6.
- Inline creation with a required centre and the preserved duplicate detection → Task 6.
- Drag-and-drop ordering via dnd-kit, handle replacing the arrows → Tasks 4 and 7.
- Exclusive corresponding author → Tasks 2 and 7.
- Save-on-demand preserved, admin-only, `EditorAuthors` untouched → Task 8.
- Tests: unit for both pure modules, e2e for both journeys, full gate → Tasks 1, 2, 9, 10.
- Out of scope (first-author editing, editing an author from the dialog, per-article affiliations) → nothing implements these.

**Placeholder scan:** Tasks 6 and 7 describe components by their contract, props and required behaviours rather than pasting full JSX, because their markup follows mockups the implementer can see in the spec; every behaviour they must satisfy is stated explicitly and is asserted by Task 9. All other tasks carry literal code.

**Type consistency:** `PickerAuthor` is defined once in Task 1 and reused by Tasks 6, 7 and 8. `AuthorPickerOption` (Task 3) is structurally identical to `PickerAuthor` and is the server-side name for the same shape. `AuthorshipEntry` is the existing type from `lib/publications/author-list.ts`, used unchanged by Tasks 2, 7 and 8. `markCorresponding` keeps that name across Tasks 2, 7 and 8.
