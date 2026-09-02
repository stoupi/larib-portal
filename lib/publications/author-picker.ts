export type PickerAuthor = {
  id: string
  firstName: string
  lastName: string
  initials: string | null
  degrees: string | null
  isOurTeam: boolean
  centreName: string | null
  publicationCount: number
}

export const AUTHOR_PICKER_TABS = ['team', 'frequent', 'all'] as const
export type AuthorPickerTab = (typeof AUTHOR_PICKER_TABS)[number]

export type AuthorSort = 'frequent' | 'alphabetical'

export const AUTHOR_PICKER_LIMIT = 50
const SHORTLIST_SIZE = 20

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
  return authors
}

export function truncateAuthors(authors: PickerAuthor[]): { visible: PickerAuthor[]; hiddenCount: number } {
  return {
    visible: authors.slice(0, AUTHOR_PICKER_LIMIT),
    hiddenCount: Math.max(0, authors.length - AUTHOR_PICKER_LIMIT),
  }
}

export type StatisticianCandidates = { signatories: PickerAuthor[]; others: PickerAuthor[] }

// The statistician nearly always signs the publication, so those authors come first
// and in signing order. The rest of the bank stays reachable underneath.
export function partitionStatisticianCandidates(
  authors: PickerAuthor[],
  articleAuthorIds: string[],
): StatisticianCandidates {
  const rank = new Map(articleAuthorIds.map((authorId, index) => [authorId, index]))
  const signatories = authors
    .filter((author) => rank.has(author.id))
    .sort((first, second) => (rank.get(first.id) ?? 0) - (rank.get(second.id) ?? 0))
  return { signatories, others: authors.filter((author) => !rank.has(author.id)) }
}
