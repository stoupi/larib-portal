import { describe, expect, it } from 'vitest'
import {
  ALL_FILTER,
  NO_STUDY_FILTER,
  NO_JOURNAL_FILTER,
  DEFAULT_DASHBOARD_FILTERS,
  computeDashboardMetrics,
  dashboardYearOptions,
  authorFocus,
  authorPositionPatch,
  isOngoingOnly,
  ongoingStatusesPatch,
  filterCoAuthors,
  resolveFocusedAuthor,
  filterDashboardArticles,
  isYearActive,
  toggleFilterValue,
  yearRangePatch,
  yearRangeBounds,
  yearSliderPatch,
  type DashboardArticleItem,
} from './admin-dashboard'

function article(overrides: Partial<DashboardArticleItem> & { id: string }): DashboardArticleItem {
  return {
    title: `Article ${overrides.id}`,
    type: 'ORIGINAL',
    journal: 'N Engl J Med',
    journalFull: 'New England Journal of Medicine',
    year: 2025,
    studyId: null,
    studyLabel: null,
    status: 'PUBLISHED',
    scope: 'LARIB_TEAM' as const,
    authors: [],
    doi: null,
    pdfUrl: null,
    lastSubmissionAt: null,
    acceptedAt: null,
    pendingDays: null,
    carouselEmailSentAt: null,
    submissions: [],
    ...overrides,
  }
}

const articles: DashboardArticleItem[] = [
  article({ id: '1', year: 2025, studyId: 'partner', studyLabel: 'PARTNER-5', authors: [{ id: 'a', name: 'Pierre Lefèvre', team: true }, { id: 'b', name: 'Camille Dubois', team: false }] }),
  article({ id: '2', year: 2024, status: 'UNDER_REVIEW', studyId: 'eacvi', studyLabel: 'EACVI-MMVD', authors: [{ id: 'a', name: 'Pierre Lefèvre', team: true }] }),
  article({ id: '3', year: 2022, status: 'IN_PREPARATION', authors: [{ id: 'b', name: 'Camille Dubois', team: false }] }),
  article({ id: '4', year: null, status: 'ABANDONED', journal: null, authors: [] }),
]

describe('filterDashboardArticles', () => {
  it('keeps every article when all filters are open', () => {
    expect(filterDashboardArticles(articles, DEFAULT_DASHBOARD_FILTERS)).toHaveLength(4)
  })

  it('combines study, year and status filters', () => {
    expect(
      filterDashboardArticles(articles, { ...DEFAULT_DASHBOARD_FILTERS, studies: ['eacvi'] }).map((item) => item.id),
    ).toEqual(['2'])
    expect(
      filterDashboardArticles(articles, { ...DEFAULT_DASHBOARD_FILTERS, yearFrom: '2022', yearTo: '2022' }).map(
        (item) => item.id,
      ),
    ).toEqual(['3'])
    expect(
      filterDashboardArticles(articles, {
        ...DEFAULT_DASHBOARD_FILTERS,
        yearFrom: '2025',
        statuses: ['UNDER_REVIEW'],
      }),
    ).toHaveLength(0)
  })

  it('keeps several studies or statuses at once', () => {
    expect(
      filterDashboardArticles(articles, { ...DEFAULT_DASHBOARD_FILTERS, studies: ['eacvi', 'partner'] }).map(
        (item) => item.id,
      ),
    ).toEqual(['1', '2'])
    expect(
      filterDashboardArticles(articles, {
        ...DEFAULT_DASHBOARD_FILTERS,
        statuses: ['UNDER_REVIEW', 'IN_PREPARATION'],
      }).map((item) => item.id),
    ).toEqual(['2', '3'])
  })

  it('keeps the articles inside the selected year range and drops the undated ones', () => {
    expect(
      filterDashboardArticles(articles, { ...DEFAULT_DASHBOARD_FILTERS, yearFrom: '2024', yearTo: '2025' }).map(
        (item) => item.id,
      ),
    ).toEqual(['1', '2'])
    expect(
      filterDashboardArticles(articles, { ...DEFAULT_DASHBOARD_FILTERS, yearTo: '2023' }).map((item) => item.id),
    ).toEqual(['3'])
  })

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
})

describe('year range clicks', () => {
  it('starts, extends and clears the range', () => {
    expect(yearRangePatch(DEFAULT_DASHBOARD_FILTERS, 2024)).toEqual({ yearFrom: '2024', yearTo: '2024' })
    const single = { ...DEFAULT_DASHBOARD_FILTERS, yearFrom: '2024', yearTo: '2024' }
    expect(yearRangePatch(single, 2022)).toEqual({ yearFrom: '2022' })
    expect(yearRangePatch(single, 2026)).toEqual({ yearTo: '2026' })
    expect(yearRangePatch(single, 2024)).toEqual({ yearFrom: ALL_FILTER, yearTo: ALL_FILTER })
    const range = { ...DEFAULT_DASHBOARD_FILTERS, yearFrom: '2022', yearTo: '2026' }
    expect(yearRangePatch(range, 2024)).toEqual({ yearFrom: '2024', yearTo: '2024' })
  })

  it('marks every year of the range as active', () => {
    const range = { ...DEFAULT_DASHBOARD_FILTERS, yearFrom: '2022', yearTo: '2024' }
    expect([2021, 2022, 2023, 2024, 2025].map((year) => isYearActive(range, year))).toEqual([
      false,
      true,
      true,
      true,
      false,
    ])
    expect(isYearActive(DEFAULT_DASHBOARD_FILTERS, 2024)).toBe(false)
  })
})

describe('journal filter', () => {
  it('counts articles per journal and lists the ones without a journal last', () => {
    expect(computeDashboardMetrics(articles, 2025).byJournal).toEqual([
      { id: 'N Engl J Med', label: 'N Engl J Med', count: 3 },
      { id: NO_JOURNAL_FILTER, label: null, count: 1 },
    ])
  })

  it('keeps the articles of the selected journals', () => {
    expect(
      filterDashboardArticles(articles, { ...DEFAULT_DASHBOARD_FILTERS, journals: [NO_JOURNAL_FILTER] }).map(
        (item) => item.id,
      ),
    ).toEqual(['4'])
    expect(
      filterDashboardArticles(articles, { ...DEFAULT_DASHBOARD_FILTERS, journals: ['N Engl J Med'] }).map(
        (item) => item.id,
      ),
    ).toEqual(['1', '2', '3'])
  })
})

describe('year slider', () => {
  const bounds = { min: 2020, max: 2026 }

  it('shows the full span when no range is set and keeps the selection inside the bounds', () => {
    expect(yearRangeBounds(DEFAULT_DASHBOARD_FILTERS, bounds)).toEqual([2020, 2026])
    expect(yearRangeBounds({ ...DEFAULT_DASHBOARD_FILTERS, yearFrom: '2023' }, bounds)).toEqual([2023, 2026])
    expect(yearRangeBounds({ ...DEFAULT_DASHBOARD_FILTERS, yearFrom: '2019', yearTo: '2030' }, bounds)).toEqual([
      2020, 2026,
    ])
  })

  it('clears the filter when both handles are back at the ends', () => {
    expect(yearSliderPatch(bounds, [2020, 2026])).toEqual({ yearFrom: ALL_FILTER, yearTo: ALL_FILTER })
    expect(yearSliderPatch(bounds, [2022, 2024])).toEqual({ yearFrom: '2022', yearTo: '2024' })
  })
})

describe('toggleFilterValue', () => {
  it('adds a missing value and removes an already selected one', () => {
    expect(toggleFilterValue([], 'a')).toEqual(['a'])
    expect(toggleFilterValue(['a', 'b'], 'a')).toEqual(['b'])
  })
})

describe('study filter', () => {
  it('keeps only the articles without a linked study', () => {
    expect(
      filterDashboardArticles(articles, { ...DEFAULT_DASHBOARD_FILTERS, studies: [NO_STUDY_FILTER] }).map(
        (item) => item.id,
      ),
    ).toEqual(['3', '4'])
  })

  it('counts articles per study and lists the unlinked ones last', () => {
    expect(computeDashboardMetrics(articles, 2025).byStudy).toEqual([
      { id: 'eacvi', label: 'EACVI-MMVD', count: 1 },
      { id: 'partner', label: 'PARTNER-5', count: 1 },
      { id: NO_STUDY_FILTER, label: null, count: 2 },
    ])
  })
})

describe('filterDashboardArticles search', () => {
  it('matches title, journal, study and author names', () => {
    const search = (query: string) =>
      filterDashboardArticles(articles, { ...DEFAULT_DASHBOARD_FILTERS, query }).map((item) => item.id)
    expect(search('eacvi')).toEqual(['2'])
    expect(search('lefèvre')).toEqual(['1', '2'])
    expect(search('n engl')).toEqual(['1', '2', '3'])
    expect(search('  ')).toHaveLength(4)
    expect(search('nothing-here')).toEqual([])
  })
})

describe('author focus', () => {
  const withPositions: DashboardArticleItem[] = [
    article({
      id: 'p1',
      authors: [
        { id: 'a', name: 'Pierre Lefèvre', team: true },
        { id: 'b', name: 'Camille Dubois', team: false },
        { id: 'c', name: 'Nora Haddad', team: true },
      ],
    }),
    article({
      id: 'p2',
      authors: [
        { id: 'b', name: 'Camille Dubois', team: false },
        { id: 'a', name: 'Pierre Lefèvre', team: true },
      ],
    }),
  ]

  it('counts the slots an author signs in', () => {
    expect(authorFocus(withPositions, 'a')).toEqual({
      id: 'a',
      name: 'Pierre Lefèvre',
      total: 2,
      positions: [
        { bucket: 'first', count: 1 },
        { bucket: 'last', count: 1 },
      ],
    })
  })

  it('returns nothing for an author outside the filtered set', () => {
    expect(authorFocus(withPositions, 'zzz')).toBeNull()
  })

  it('filters articles by author id', () => {
    expect(
      filterDashboardArticles(withPositions, { ...DEFAULT_DASHBOARD_FILTERS, author: 'c' }).map((item) => item.id),
    ).toEqual(['p1'])
  })

  it('focuses an author from the filter, or from a search matching exactly one name', () => {
    const coAuthors = computeDashboardMetrics(withPositions, 2025).coAuthors
    expect(resolveFocusedAuthor(coAuthors, { ...DEFAULT_DASHBOARD_FILTERS, author: 'b' })).toBe('b')
    expect(resolveFocusedAuthor(coAuthors, { ...DEFAULT_DASHBOARD_FILTERS, query: 'haddad' })).toBe('c')
    expect(resolveFocusedAuthor(coAuthors, { ...DEFAULT_DASHBOARD_FILTERS, query: 'e' })).toBeNull()
    expect(resolveFocusedAuthor(coAuthors, DEFAULT_DASHBOARD_FILTERS)).toBeNull()
  })
})

describe('filterCoAuthors', () => {
  it('splits our team from external co-authors', () => {
    const coAuthors = computeDashboardMetrics(articles, 2025).coAuthors
    expect(filterCoAuthors(coAuthors, 'all')).toHaveLength(2)
    expect(filterCoAuthors(coAuthors, 'team').map((entry) => entry.id)).toEqual(['a'])
    expect(filterCoAuthors(coAuthors, 'external').map((entry) => entry.id)).toEqual(['b'])
  })

  it('matches a typed first name, last name or both, whatever the order', () => {
    const coAuthors = computeDashboardMetrics(articles, 2025).coAuthors
    expect(filterCoAuthors(coAuthors, 'all', 'pierre').map((entry) => entry.id)).toEqual(['a'])
    expect(filterCoAuthors(coAuthors, 'all', 'dubois').map((entry) => entry.id)).toEqual(['b'])
    expect(filterCoAuthors(coAuthors, 'all', 'dubois camille').map((entry) => entry.id)).toEqual(['b'])
    expect(filterCoAuthors(coAuthors, 'all', '  ')).toHaveLength(2)
    expect(filterCoAuthors(coAuthors, 'all', 'zzz')).toHaveLength(0)
    expect(filterCoAuthors(coAuthors, 'team', 'camille')).toHaveLength(0)
  })
})

describe('dashboardYearOptions', () => {
  it('lists the distinct years, newest first, ignoring undated articles', () => {
    expect(dashboardYearOptions(articles)).toEqual([2025, 2024, 2022])
  })
})

describe('computeDashboardMetrics', () => {
  it('counts statuses, co-authors and studies', () => {
    const metrics = computeDashboardMetrics(articles, 2025)
    expect(metrics.total).toBe(4)
    expect(metrics.publishedCount).toBe(1)
    expect(metrics.publishedShare).toBe(25)
    expect(metrics.inProgressCount).toBe(2)
    expect(metrics.coAuthorCount).toBe(2)
    expect(metrics.studyCount).toBe(2)
    expect(metrics.currentYearCount).toBe(1)
  })

  it('ranks the busiest co-authors first and breaks ties by name', () => {
    const withExtra = [...articles, article({ id: '5', authors: [{ id: 'a', name: 'Pierre Lefèvre', team: true }] })]
    expect(computeDashboardMetrics(withExtra, 2025).coAuthors).toEqual([
      { id: 'a', name: 'Pierre Lefèvre', team: true, count: 3 },
      { id: 'b', name: 'Camille Dubois', team: false, count: 2 },
    ])
    expect(computeDashboardMetrics(articles, 2025).coAuthors).toEqual([
      { id: 'b', name: 'Camille Dubois', team: false, count: 2 },
      { id: 'a', name: 'Pierre Lefèvre', team: true, count: 2 },
    ])
  })

  it('fills the gaps between the first and last year', () => {
    const metrics = computeDashboardMetrics(articles, 2025)
    expect(metrics.perYear).toEqual([
      { year: 2022, count: 1 },
      { year: 2023, count: 0 },
      { year: 2024, count: 1 },
      { year: 2025, count: 1 },
    ])
  })

  it('charts every year, however long the span', () => {
    const spread = [article({ id: 'old', year: 2015 }), article({ id: 'new', year: 2026 })]
    const perYear = computeDashboardMetrics(spread, 2026).perYear
    expect(perYear).toHaveLength(12)
    expect(perYear.at(0)).toEqual({ year: 2015, count: 1 })
    expect(perYear.at(-1)).toEqual({ year: 2026, count: 1 })
  })

  it('keeps only the statuses actually present, in display order', () => {
    const metrics = computeDashboardMetrics(articles, 2025)
    expect(metrics.byStatus).toEqual([
      { status: 'PUBLISHED', count: 1 },
      { status: 'UNDER_REVIEW', count: 1 },
      { status: 'IN_PREPARATION', count: 1 },
      { status: 'ABANDONED', count: 1 },
    ])
  })

  it('returns a zeroed shape for an empty library', () => {
    const metrics = computeDashboardMetrics([], 2025)
    expect(metrics).toMatchObject({ total: 0, publishedShare: 0, coAuthorCount: 0, perYear: [], byStatus: [], coAuthors: [] })
  })
})

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

describe('author position filter', () => {
  const ranked: DashboardArticleItem[] = [
    article({ id: 'first', authors: [{ id: 'a', name: 'Pierre Lefèvre', team: true }, { id: 'b', name: 'Camille Dubois', team: false }] }),
    article({ id: 'last', authors: [{ id: 'b', name: 'Camille Dubois', team: false }, { id: 'a', name: 'Pierre Lefèvre', team: true }] }),
  ]

  it('keeps only the papers where the pinned author holds the chosen rank', () => {
    const filters = { ...DEFAULT_DASHBOARD_FILTERS, author: 'a', authorPosition: 'first' }
    expect(filterDashboardArticles(ranked, filters).map((item) => item.id)).toEqual(['first'])
    expect(
      filterDashboardArticles(ranked, { ...filters, authorPosition: 'last' }).map((item) => item.id),
    ).toEqual(['last'])
  })

  it('ignores the rank when no author is pinned', () => {
    expect(
      filterDashboardArticles(ranked, { ...DEFAULT_DASHBOARD_FILTERS, authorPosition: 'first' }),
    ).toHaveLength(2)
  })

  it('pins the author on the first click and lifts the rank on the second', () => {
    const patch = authorPositionPatch(DEFAULT_DASHBOARD_FILTERS, 'a', 'first')
    expect(patch).toEqual({ author: 'a', authorPosition: 'first' })
    expect(authorPositionPatch({ ...DEFAULT_DASHBOARD_FILTERS, ...patch }, 'a', 'first')).toEqual({
      author: 'a',
      authorPosition: ALL_FILTER,
    })
  })
})

describe('ongoing shortcut', () => {
  it('keeps everything that is neither accepted, published nor abandoned', () => {
    const patch = ongoingStatusesPatch(DEFAULT_DASHBOARD_FILTERS)
    expect(filterDashboardArticles(articles, { ...DEFAULT_DASHBOARD_FILTERS, ...patch }).map((item) => item.id)).toEqual([
      '2',
      '3',
    ])
  })

  it('toggles back to every status on a second click', () => {
    const on = { ...DEFAULT_DASHBOARD_FILTERS, ...ongoingStatusesPatch(DEFAULT_DASHBOARD_FILTERS) }
    expect(isOngoingOnly(on)).toBe(true)
    expect(ongoingStatusesPatch(on)).toEqual({ statuses: [] })
    expect(isOngoingOnly(DEFAULT_DASHBOARD_FILTERS)).toBe(false)
  })
})

describe('article type filter', () => {
  const mixed: DashboardArticleItem[] = [
    article({ id: 'original', type: 'ORIGINAL' }),
    article({ id: 'review', type: 'REVIEW' }),
    article({ id: 'editorial', type: 'EDITORIAL' }),
  ]

  it('keeps only the chosen types and ignores the filter when empty', () => {
    expect(
      filterDashboardArticles(mixed, { ...DEFAULT_DASHBOARD_FILTERS, types: ['REVIEW', 'EDITORIAL'] }).map(
        (item) => item.id,
      ),
    ).toEqual(['review', 'editorial'])
    expect(filterDashboardArticles(mixed, DEFAULT_DASHBOARD_FILTERS)).toHaveLength(3)
  })
})
