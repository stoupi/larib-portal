import { describe, expect, it } from 'vitest'
import { matchesArticleQuery } from './article-search'
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
    pendingDays: null,
    carouselEmailSentAt: null,
    submissions: [],
    ...overrides,
  }
}

describe('matchesArticleQuery', () => {
  it('matches an empty or blank query', () => {
    const item = article({ id: '1' })
    expect(matchesArticleQuery(item, '')).toBe(true)
    expect(matchesArticleQuery(item, '   ')).toBe(true)
  })

  it('matches on title, journal, study and author names', () => {
    const item = article({
      id: '1',
      title: 'Colchicine trial',
      journal: 'Eur Heart J',
      studyLabel: 'EACVI-MMVD',
      authors: [{ id: 'a', name: 'Pierre Lefèvre', team: true }],
    })
    expect(matchesArticleQuery(item, 'colchicine')).toBe(true)
    expect(matchesArticleQuery(item, 'eur heart')).toBe(true)
    expect(matchesArticleQuery(item, 'eacvi')).toBe(true)
    expect(matchesArticleQuery(item, 'lefèvre')).toBe(true)
    expect(matchesArticleQuery(item, 'nothing-here')).toBe(false)
  })
})
