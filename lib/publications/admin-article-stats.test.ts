import { describe, expect, it } from 'vitest'
import {
  ALL_ADMIN_FILTER,
  DEFAULT_ADMIN_ARTICLE_FILTERS,
  NO_STUDY_FILTER,
  adminArticleFiltersActive,
  adminArticleGroupCounts,
  adminJournalOptions,
  adminStudyOptions,
  computeAdminArticleStats,
  filterAdminArticles,
} from './admin-article-stats'
import type { DashboardArticleItem } from './admin-dashboard'

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
  article({ id: '1', year: 2025, studyLabel: 'PARTNER-5', authors: [{ id: 'a', name: 'Pierre Lefèvre' }] }),
  article({ id: '2', year: 2023, studyLabel: 'PARTNER-5', journal: 'Eur Heart J', status: 'UNDER_REVIEW', type: 'REVIEW' }),
  article({ id: '3', year: null, status: 'IN_PREPARATION', journal: null, title: 'Colchicine trial' }),
  article({ id: '4', year: 2025, status: 'ABANDONED', studyLabel: 'EACVI-MMVD' }),
]

describe('filterAdminArticles', () => {
  it('returns everything with the default filters', () => {
    expect(filterAdminArticles(articles, DEFAULT_ADMIN_ARTICLE_FILTERS, 'all', '')).toHaveLength(4)
  })

  it('filters by group, status, journal, study and type', () => {
    const ids = (result: DashboardArticleItem[]) => result.map((item) => item.id)
    expect(ids(filterAdminArticles(articles, DEFAULT_ADMIN_ARTICLE_FILTERS, 'published', ''))).toEqual(['1'])
    expect(ids(filterAdminArticles(articles, DEFAULT_ADMIN_ARTICLE_FILTERS, 'draft', ''))).toEqual(['3'])
    expect(ids(filterAdminArticles(articles, { ...DEFAULT_ADMIN_ARTICLE_FILTERS, journal: 'Eur Heart J' }, 'all', ''))).toEqual(['2'])
    expect(ids(filterAdminArticles(articles, { ...DEFAULT_ADMIN_ARTICLE_FILTERS, type: 'REVIEW' }, 'all', ''))).toEqual(['2'])
    expect(ids(filterAdminArticles(articles, { ...DEFAULT_ADMIN_ARTICLE_FILTERS, study: 'PARTNER-5' }, 'all', ''))).toEqual(['1', '2'])
    expect(ids(filterAdminArticles(articles, { ...DEFAULT_ADMIN_ARTICLE_FILTERS, study: NO_STUDY_FILTER }, 'all', ''))).toEqual(['3'])
  })

  it('searches title, journal, study and author names', () => {
    const ids = (query: string) => filterAdminArticles(articles, DEFAULT_ADMIN_ARTICLE_FILTERS, 'all', query).map((item) => item.id)
    expect(ids('colchicine')).toEqual(['3'])
    expect(ids('eur heart')).toEqual(['2'])
    expect(ids('eacvi')).toEqual(['4'])
    expect(ids('lefèvre')).toEqual(['1'])
    expect(ids('   ')).toHaveLength(4)
  })
})

describe('adminArticleGroupCounts', () => {
  it('counts each tab', () => {
    expect(adminArticleGroupCounts(articles)).toMatchObject({ all: 4, published: 1, inProgress: 1, draft: 1, other: 1 })
  })
})

describe('filter option lists', () => {
  it('lists distinct studies and journals alphabetically', () => {
    expect(adminStudyOptions(articles)).toEqual(['EACVI-MMVD', 'PARTNER-5'])
    expect(adminJournalOptions(articles)).toEqual(['Eur Heart J', 'N Engl J Med'])
  })
})

describe('adminArticleFiltersActive', () => {
  it('is false only when every filter is open', () => {
    expect(adminArticleFiltersActive(DEFAULT_ADMIN_ARTICLE_FILTERS)).toBe(false)
    expect(adminArticleFiltersActive({ ...DEFAULT_ADMIN_ARTICLE_FILTERS, status: 'PUBLISHED' })).toBe(true)
  })
})

describe('computeAdminArticleStats', () => {
  it('counts totals and undated articles', () => {
    const stats = computeAdminArticleStats(articles)
    expect(stats.total).toBe(4)
    expect(stats.pending).toBe(1)
  })

  it('fills the year range without gaps', () => {
    expect(computeAdminArticleStats(articles).perYear).toEqual([
      { year: 2023, count: 1 },
      { year: 2024, count: 0 },
      { year: 2025, count: 2 },
    ])
  })

  it('keeps only the statuses and types in use, in display order', () => {
    const stats = computeAdminArticleStats(articles)
    expect(stats.byStatus).toEqual([
      { status: 'PUBLISHED', count: 1 },
      { status: 'UNDER_REVIEW', count: 1 },
      { status: 'IN_PREPARATION', count: 1 },
      { status: 'ABANDONED', count: 1 },
    ])
    expect(stats.byType.map((entry) => entry.type)).toEqual(['ORIGINAL', 'REVIEW'])
  })

  it('ranks studies and journals by volume', () => {
    const stats = computeAdminArticleStats(articles)
    expect(stats.byStudy).toEqual([
      { study: 'PARTNER-5', count: 2 },
      { study: 'EACVI-MMVD', count: 1 },
    ])
    expect(stats.byJournal).toEqual([
      { journal: 'N Engl J Med', count: 2 },
      { journal: 'Eur Heart J', count: 1 },
    ])
  })

  it('handles an empty library', () => {
    expect(computeAdminArticleStats([])).toMatchObject({ total: 0, pending: 0, perYear: [], byStatus: [], byStudy: [] })
  })

  it('never lets a filter value leak between studies and the no-study bucket', () => {
    const onlyStudied = filterAdminArticles(articles, { ...DEFAULT_ADMIN_ARTICLE_FILTERS, study: 'EACVI-MMVD' }, 'all', '')
    expect(onlyStudied.every((item) => item.studyLabel === 'EACVI-MMVD')).toBe(true)
    expect(filterAdminArticles(articles, { ...DEFAULT_ADMIN_ARTICLE_FILTERS, study: ALL_ADMIN_FILTER }, 'all', '')).toHaveLength(4)
  })
})
