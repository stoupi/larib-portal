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
  const team = author({ id: 'team', isOurTeam: true, publicationCount: 1 })
  const prolific = author({ id: 'prolific', isOurTeam: false, publicationCount: 99 })
  const fresh = author({ id: 'fresh', isOurTeam: false, publicationCount: 0 })
  const bank = [team, prolific, fresh]

  it('keeps only our team on the team tab', () => {
    expect(authorsForTab(bank, 'team').map((entry) => entry.id)).toEqual(['team'])
  })

  it('ranks the frequent tab by publication count', () => {
    expect(authorsForTab(bank, 'frequent')[0].id).toBe('prolific')
  })

  it('returns everyone on the all tab', () => {
    expect(authorsForTab(bank, 'all')).toHaveLength(3)
  })

  it('exposes the four tabs in display order', () => {
    expect(AUTHOR_PICKER_TABS).toEqual(['team', 'frequent', 'all'])
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
