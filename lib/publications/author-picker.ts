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
