import { describe, expect, it } from 'vitest'
import {
  ALL_FILTER,
  DEFAULT_DASHBOARD_FILTERS,
  computeDashboardMetrics,
  dashboardYearOptions,
  filterDashboardArticles,
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
    authors: [],
    doi: null,
    pdfUrl: null,
    lastSubmissionAt: null,
    acceptedAt: null,
    pendingDays: null,
    submissions: [],
    ...overrides,
  }
}

const articles: DashboardArticleItem[] = [
  article({ id: '1', year: 2025, studyId: 'partner', studyLabel: 'PARTNER-5', authors: [{ id: 'a', name: 'Pierre Lefèvre' }, { id: 'b', name: 'Camille Dubois' }] }),
  article({ id: '2', year: 2024, status: 'UNDER_REVIEW', studyId: 'eacvi', studyLabel: 'EACVI-MMVD', authors: [{ id: 'a', name: 'Pierre Lefèvre' }] }),
  article({ id: '3', year: 2022, status: 'IN_PREPARATION', authors: [{ id: 'b', name: 'Camille Dubois' }] }),
  article({ id: '4', year: null, status: 'ABANDONED', journal: null, authors: [] }),
]

describe('filterDashboardArticles', () => {
  it('keeps every article when all filters are open', () => {
    expect(filterDashboardArticles(articles, { study: ALL_FILTER, year: ALL_FILTER, status: ALL_FILTER, query: '' })).toHaveLength(4)
  })

  it('combines study, year and status filters', () => {
    expect(filterDashboardArticles(articles, { study: 'eacvi', year: ALL_FILTER, status: ALL_FILTER, query: '' }).map((item) => item.id)).toEqual(['2'])
    expect(filterDashboardArticles(articles, { study: ALL_FILTER, year: '2022', status: ALL_FILTER, query: '' }).map((item) => item.id)).toEqual(['3'])
    expect(filterDashboardArticles(articles, { study: ALL_FILTER, year: '2025', status: 'UNDER_REVIEW', query: '' })).toHaveLength(0)
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
    const withExtra = [...articles, article({ id: '5', authors: [{ id: 'a', name: 'Pierre Lefèvre' }] })]
    expect(computeDashboardMetrics(withExtra, 2025).topCoAuthors).toEqual([
      { id: 'a', name: 'Pierre Lefèvre', count: 3 },
      { id: 'b', name: 'Camille Dubois', count: 2 },
    ])
    expect(computeDashboardMetrics(articles, 2025).topCoAuthors).toEqual([
      { id: 'b', name: 'Camille Dubois', count: 2 },
      { id: 'a', name: 'Pierre Lefèvre', count: 2 },
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
    expect(metrics).toMatchObject({ total: 0, publishedShare: 0, coAuthorCount: 0, perYear: [], byStatus: [], topCoAuthors: [] })
  })
})
