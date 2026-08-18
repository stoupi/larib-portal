import { describe, expect, it } from 'vitest'
import {
  communicationTabCounts,
  countPendingCommunications,
  filterCommunicationArticles,
  isCarouselEmailPending,
  type CommunicationArticleItem,
} from './communication'

function communicationArticle(
  overrides: Partial<CommunicationArticleItem> & { id: string },
): CommunicationArticleItem {
  return {
    title: `Article ${overrides.id}`,
    journal: 'Eur Heart J',
    status: 'ACCEPTED',
    firstAuthorName: 'Nina Zellweger',
    milestoneAt: '2026-02-15T00:00:00.000Z',
    carouselEmailSentAt: null,
    ...overrides,
  }
}

const articles: CommunicationArticleItem[] = [
  communicationArticle({ id: 'pending-accepted', title: 'Valvular imaging in routine practice' }),
  communicationArticle({
    id: 'sent-published',
    title: 'Aortic outcomes after TAVI',
    status: 'PUBLISHED',
    journal: 'Circulation',
    firstAuthorName: 'Marc Zurbrugg',
    carouselEmailSentAt: '2026-03-01T00:00:00.000Z',
  }),
  communicationArticle({ id: 'pending-published', title: 'Strain analysis pitfalls', status: 'PUBLISHED' }),
]

describe('communication list', () => {
  it('splits articles between the carousel emails still to send and those already sent', () => {
    expect(articles.map(isCarouselEmailPending)).toEqual([true, false, true])
    expect(countPendingCommunications(articles)).toBe(2)
    expect(communicationTabCounts(articles)).toEqual({ pending: 2, sent: 1, all: 3 })
  })

  it('filters by tab and searches title, journal and first author', () => {
    expect(filterCommunicationArticles(articles, 'pending', '').map((article) => article.id)).toEqual([
      'pending-accepted',
      'pending-published',
    ])
    expect(filterCommunicationArticles(articles, 'sent', '').map((article) => article.id)).toEqual(['sent-published'])
    expect(filterCommunicationArticles(articles, 'all', 'circulation').map((article) => article.id)).toEqual([
      'sent-published',
    ])
    expect(filterCommunicationArticles(articles, 'all', 'zurbrugg').map((article) => article.id)).toEqual([
      'sent-published',
    ])
    expect(filterCommunicationArticles(articles, 'all', 'strain pitfalls').map((article) => article.id)).toEqual([
      'pending-published',
    ])
    expect(filterCommunicationArticles(articles, 'pending', 'circulation')).toEqual([])
  })

  it('keeps every article when the query is only whitespace', () => {
    expect(filterCommunicationArticles(articles, 'all', '   ')).toHaveLength(3)
  })
})
