import type { PubmedAuthor } from '@/types/publications'
import { normalizeName, authorFirstInitial } from '@/lib/services/publications/import-dedupe'

export type ViewerIdentity = { firstName: string; lastName: string; initials?: string | null }

export const IMPORTABLE_DRAFT_FIELDS = ['title', 'journal', 'doi', 'abstract', 'authors', 'dates'] as const
export type ImportableDraftField = (typeof IMPORTABLE_DRAFT_FIELDS)[number]

export type DraftSummary = {
  title: string
  journalName: string | null
  doi: string | null
  abstract: string | null
  // Authors beyond the creator the draft adds automatically: only those represent work
  // the import would throw away.
  otherAuthorCount: number
  publishedAt: string | null
}

// A member may only import a paper they signed. PubMed spells names inconsistently
// (accents dropped, fore name reduced to an initial), so we compare the same way the
// import deduplicates authors: last name plus first initial.
export function authorIsViewer(
  author: { lastName: string; foreName?: string | null; initials?: string | null },
  viewer: ViewerIdentity,
): boolean {
  const viewerLastName = normalizeName(viewer.lastName)
  if (viewerLastName.length === 0) return false
  if (normalizeName(author.lastName) !== viewerLastName) return false
  const viewerInitial = authorFirstInitial(viewer)
  const authorInitial = authorFirstInitial(author)
  if (viewerInitial === '' || authorInitial === '') return true
  return authorInitial === viewerInitial
}

export function viewerIsAmongAuthors(recordAuthors: PubmedAuthor[], viewer: ViewerIdentity): boolean {
  return recordAuthors.some((author) => authorIsViewer(author, viewer))
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

// Only fields the draft already fills and the record would change are worth warning about:
// replacing an empty title with the PubMed one is not a loss.
export function draftFieldsReplacedByImport(
  draft: DraftSummary,
  record: { title: string; journalName: string | null; doi: string | null; abstract: string | null; publishedAt: string | null },
): ImportableDraftField[] {
  const replaced: ImportableDraftField[] = []
  if (hasText(draft.title) && draft.title.trim() !== record.title.trim()) replaced.push('title')
  if (hasText(draft.journalName) && draft.journalName !== record.journalName) replaced.push('journal')
  if (hasText(draft.doi) && draft.doi !== record.doi) replaced.push('doi')
  if (hasText(draft.abstract) && draft.abstract !== record.abstract) replaced.push('abstract')
  if (draft.otherAuthorCount > 0) replaced.push('authors')
  if (hasText(draft.publishedAt) && draft.publishedAt !== record.publishedAt) replaced.push('dates')
  return replaced
}

export function defaultPubmedQueryForViewer(viewer: ViewerIdentity): string {
  const lastName = viewer.lastName.trim()
  if (lastName.length === 0) return ''
  const initial = (viewer.initials ?? viewer.firstName ?? '').trim().charAt(0).toUpperCase()
  return initial ? `${lastName} ${initial}` : lastName
}
