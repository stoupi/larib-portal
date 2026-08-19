# Import from PubMed for members — design

Date: 2026-08-19

## Problem

`/publications/admin/import` lets an admin search PubMed, see which papers are already
in the library, and import a batch. A regular member has no such shortcut: creating a
publication opens an empty draft that must be typed by hand, even when the paper is
already indexed on PubMed with its full author list.

## Goal

Bring the admin module's behaviour — PubMed search, "already in the app" detection,
author-bank linking, journal and affiliation upserts — to every member, one paper at a
time, from the two places a publication starts.

## Decisions

| Question | Decision |
|---|---|
| Where does the button live? | Both: next to *New publication* (creates the article) and in the editor next to *Discard* (fills the open draft). |
| Draft already filled? | Show exactly which fields will be replaced, then require an explicit confirm. |
| What can a member import? | Only papers whose PubMed author list contains them. Admins keep the unrestricted module. |
| Status / scope of an imported paper | `PUBLISHED`, scope proposed automatically from the team-author count — same as the admin module. |

## Flow

1. **Search** — one field accepting PMID, DOI, author or title (`searchPubmed` already
   handles all four). For a member the query is pre-filled with their own name.
2. **Results** — the admin module's table and badges: **New** / **Already in the app** /
   **Look-alike**. A row already in the library offers a link to the existing article
   instead of a select button.
3. **Preview** — the full PubMed record: title, journal, year, DOI, abstract and the
   author list, with team members in coral and the viewer's own name highlighted. A
   member who does not appear in the list gets a blocking banner.
4. **Confirm** — in *fill* mode, an amber box lists the draft fields the import will
   replace; the confirm button is explicit about replacing.

## Architecture

### Pure logic — `lib/publications/pubmed-import.ts`

- `viewerIsAmongAuthors(recordAuthors, viewer)` — last name + first initial, reusing
  `normalizeName` / `authorFirstInitial` from `import-dedupe`.
- `draftFieldsReplacedByImport(draft, record)` — which of title / journal / doi /
  abstract / authors / dates the import overwrites, for the confirmation box.
- `defaultPubmedQueryForViewer(viewer)` — `"Lastname F"`.

### Services

- `lib/services/publications/import.ts` — extract the per-record work (journal upsert,
  author dedupe against the bank, affiliation and centre resolution) into
  `prepareRecordApplication()`. `importRecords()` keeps using it to create articles; a
  new `fillArticleFromRecord(articleId, record, scope)` applies the same result to an
  existing article, replacing its authorships in one nested write.
- `lib/services/publications/pubmed-search.ts` — `searchPubmedWithLibraryMatches()` and
  `buildRecordPreview()`, shared by the admin module's actions and the new member ones,
  so the matching rules cannot drift apart.

### Server actions — `app/[locale]/publications/actions.ts`

| Action | Guard |
|---|---|
| `searchPubmedCandidatesAction` | `appMemberAction('PUBLICATIONS')` — read-only |
| `fetchPubmedRecordPreviewAction` | `appMemberAction('PUBLICATIONS')` — read-only |
| `importPubmedIntoArticleAction` | admin **or** first author of the article; non-admin must appear in the record's authors |
| `createArticleFromPubmedAction` | app access; non-admin must appear in the record's authors |

Both import actions refuse when the PMID already belongs to an article and return that
article's id so the UI can link to it. The scope is recomputed server-side from the
record; the client never dictates it.

### UI

`components/pubmed-import-dialog.tsx` (shell and state) with
`pubmed-import-results.tsx` and `pubmed-import-preview.tsx`. One `target` prop carries
either `{ mode: 'create', asAdmin }` or `{ mode: 'fill', articleId, draft }`.

Mounted next to `NewPublicationButton` on `publications/page.tsx` and the admin
dashboard, and in the editor's top bar left of *Discard* whenever the save bar shows.

## Tests

- Unit: `viewerIsAmongAuthors` (accents, initials, homonyms, missing fore name),
  `draftFieldsReplacedByImport`, `defaultPubmedQueryForViewer`.
- E2E: a member opens a draft, imports from PubMed, sees the *already in the app* badge
  on a known paper, picks a new one, confirms the replacement, and lands on a filled
  article with linked authors; and is blocked on a paper they did not co-author.
