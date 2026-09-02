import { describe, expect, it } from 'vitest'
import { nextArticleSort, sortArticles, type ArticleSortKey, milestoneDate } from './article-sort'
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
    scope: 'LARIB_TEAM' as const,
    authors: [],
    doi: null,
    pdfUrl: null,
    lastSubmissionAt: null,
    acceptedAt: null,
    publishedAt: null,
    pendingDays: null,
    carouselEmailSentAt: null,
    linkedinPostUrl: null,
    statisticianId: null,
    submissions: [],
    ...overrides,
  }
}

const articles: DashboardArticleItem[] = [
  article({
    id: '1',
    title: 'Zebra imaging',
    journal: 'Eur Heart J',
    studyLabel: 'PARTNER-5',
    status: 'UNDER_REVIEW',
    lastSubmissionAt: '2026-02-15T00:00:00.000Z',
  }),
  article({
    id: '2',
    title: 'aortic valve outcomes',
    journal: null,
    studyLabel: 'EACVI-MMVD',
    status: 'PUBLISHED',
    lastSubmissionAt: '2024-06-01T00:00:00.000Z',
  }),
  article({ id: '3', title: 'Mitral repair', journal: 'Circulation', studyLabel: null, status: 'IN_PREPARATION' }),
]

const ids = (sorted: DashboardArticleItem[]) => sorted.map((item) => item.id)
const sortedIds = (key: ArticleSortKey, direction: 'asc' | 'desc') => ids(sortArticles(articles, { key, direction }))

describe('sortArticles', () => {
  it('keeps the original order without a sort', () => {
    expect(ids(sortArticles(articles, null))).toEqual(['1', '2', '3'])
  })

  it('sorts titles case-insensitively in both directions', () => {
    expect(sortedIds('title', 'asc')).toEqual(['2', '3', '1'])
    expect(sortedIds('title', 'desc')).toEqual(['1', '3', '2'])
  })

  it('sorts by journal and study, always keeping empty values last', () => {
    expect(sortedIds('journal', 'asc')).toEqual(['3', '1', '2'])
    expect(sortedIds('journal', 'desc')).toEqual(['1', '3', '2'])
    expect(sortedIds('study', 'asc')).toEqual(['2', '1', '3'])
    expect(sortedIds('study', 'desc')).toEqual(['1', '2', '3'])
  })

  it('sorts statuses by display order', () => {
    expect(sortedIds('status', 'asc')).toEqual(['2', '1', '3'])
    expect(sortedIds('status', 'desc')).toEqual(['3', '1', '2'])
  })

  it('sorts submissions chronologically with undated articles last', () => {
    expect(sortedIds('submission', 'asc')).toEqual(['2', '1', '3'])
    expect(sortedIds('submission', 'desc')).toEqual(['1', '2', '3'])
  })

  it('does not mutate the input', () => {
    const input = [...articles]
    sortArticles(input, { key: 'title', direction: 'desc' })
    expect(ids(input)).toEqual(['1', '2', '3'])
  })
})

describe('nextArticleSort', () => {
  it('cycles ascending, descending, then off', () => {
    expect(nextArticleSort(null, 'title')).toEqual({ key: 'title', direction: 'asc' })
    expect(nextArticleSort({ key: 'title', direction: 'asc' }, 'title')).toEqual({ key: 'title', direction: 'desc' })
    expect(nextArticleSort({ key: 'title', direction: 'desc' }, 'title')).toBeNull()
  })

  it('restarts ascending when switching column', () => {
    expect(nextArticleSort({ key: 'title', direction: 'desc' }, 'journal')).toEqual({ key: 'journal', direction: 'asc' })
  })
})

describe('sorting on the submission column', () => {
  const paper = (id: string, dates: Partial<DashboardArticleItem>) =>
    article({ id, title: id, journal: null, studyLabel: null, status: 'PUBLISHED', ...dates })

  it('reads the publication date first, then the acceptance, then the submission', () => {
    const rows = [
      paper('submitted', { lastSubmissionAt: '2026-05-01T00:00:00.000Z' }),
      paper('published', {
        publishedAt: '2026-01-01T00:00:00.000Z',
        acceptedAt: '2025-12-01T00:00:00.000Z',
        lastSubmissionAt: '2025-06-01T00:00:00.000Z',
      }),
      paper('accepted', { acceptedAt: '2026-03-01T00:00:00.000Z', lastSubmissionAt: '2025-01-01T00:00:00.000Z' }),
    ]
    expect(sortArticles(rows, { key: 'submission', direction: 'asc' }).map((row) => row.id)).toEqual([
      'published',
      'accepted',
      'submitted',
    ])
  })

  it('keeps a paper with no date at all at the end, whichever way round', () => {
    const rows = [
      paper('nothing', {}),
      paper('dated', { lastSubmissionAt: '2026-05-01T00:00:00.000Z' }),
    ]
    expect(sortArticles(rows, { key: 'submission', direction: 'asc' }).map((row) => row.id)).toEqual([
      'dated',
      'nothing',
    ])
    expect(sortArticles(rows, { key: 'submission', direction: 'desc' }).map((row) => row.id)).toEqual([
      'dated',
      'nothing',
    ])
  })

  it('exposes the date it sorted on', () => {
    expect(milestoneDate(paper('x', { publishedAt: '2026-01-01T00:00:00.000Z', acceptedAt: '2025-01-01T00:00:00.000Z' }))).toBe(
      '2026-01-01T00:00:00.000Z',
    )
    expect(milestoneDate(paper('y', { acceptedAt: '2025-01-01T00:00:00.000Z' }))).toBe('2025-01-01T00:00:00.000Z')
    expect(milestoneDate(paper('z', {}))).toBeNull()
  })
})
