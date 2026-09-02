import { describe, expect, it } from 'vitest'
import {
  carouselEmailState,
  communicationTabCounts,
  countPendingCommunications,
  filterCommunicationArticles,
  isCarouselEmailPending,
  nextCommunicationSort,
  sortCommunicationArticles,
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
    authorNames: ['Nina Zellweger', 'Marc Zurbrugg'],
    acceptedAt: '2026-02-15T00:00:00.000Z',
    carouselEmailSentAt: null,
    linkedinPostUrl: null,
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
    authorNames: ['Marc Zurbrugg', 'Jane Coauthor'],
    acceptedAt: '2026-01-05T00:00:00.000Z',
    carouselEmailSentAt: '2026-03-01T00:00:00.000Z',
  }),
  communicationArticle({
    id: 'pending-published',
    title: 'Strain analysis pitfalls',
    status: 'PUBLISHED',
    acceptedAt: null,
  }),
]

describe('communication list', () => {
  it('splits articles between the carousel emails still to send and those already sent', () => {
    expect(articles.map(isCarouselEmailPending)).toEqual([true, false, true])
    expect(countPendingCommunications(articles)).toBe(2)
    expect(communicationTabCounts(articles)).toEqual({ pending: 2, sent: 1, all: 3 })
  })

  it('filters by tab and searches title, journal and every author', () => {
    expect(filterCommunicationArticles(articles, 'pending', '').map((article) => article.id)).toEqual([
      'pending-accepted',
      'pending-published',
    ])
    expect(filterCommunicationArticles(articles, 'sent', '').map((article) => article.id)).toEqual(['sent-published'])
    expect(filterCommunicationArticles(articles, 'all', 'circulation').map((article) => article.id)).toEqual([
      'sent-published',
    ])
    expect(filterCommunicationArticles(articles, 'all', 'coauthor').map((article) => article.id)).toEqual([
      'sent-published',
    ])
    expect(filterCommunicationArticles(articles, 'all', 'zurbrugg').map((article) => article.id)).toEqual([
      'pending-accepted',
      'sent-published',
      'pending-published',
    ])
    expect(filterCommunicationArticles(articles, 'all', 'strain pitfalls').map((article) => article.id)).toEqual([
      'pending-published',
    ])
    expect(filterCommunicationArticles(articles, 'pending', 'circulation')).toEqual([])
  })

  it('keeps every article when the query is only whitespace', () => {
    expect(filterCommunicationArticles(articles, 'all', '   ')).toHaveLength(3)
  })

  it('sorts by acceptance date both ways, always leaving undated articles last', () => {
    expect(
      sortCommunicationArticles(articles, { key: 'acceptedAt', direction: 'desc' }).map((article) => article.id),
    ).toEqual(['pending-accepted', 'sent-published', 'pending-published'])
    expect(
      sortCommunicationArticles(articles, { key: 'acceptedAt', direction: 'asc' }).map((article) => article.id),
    ).toEqual(['sent-published', 'pending-accepted', 'pending-published'])
  })

  it('sorts by title and toggles the direction of the clicked column', () => {
    expect(sortCommunicationArticles(articles, { key: 'title', direction: 'asc' }).map((article) => article.id)).toEqual(
      ['sent-published', 'pending-published', 'pending-accepted'],
    )
    expect(nextCommunicationSort({ key: 'acceptedAt', direction: 'desc' }, 'acceptedAt')).toEqual({
      key: 'acceptedAt',
      direction: 'asc',
    })
    expect(nextCommunicationSort({ key: 'acceptedAt', direction: 'desc' }, 'title')).toEqual({
      key: 'title',
      direction: 'asc',
    })
  })
})

describe('carouselEmailState', () => {
  it('reports the email as sent once it has left', () => {
    expect(carouselEmailState({ status: 'PUBLISHED', carouselEmailSentAt: '2026-03-01T00:00:00.000Z' })).toBe('sent')
  })

  it('reports an accepted paper with no email as pending', () => {
    expect(carouselEmailState({ status: 'ACCEPTED', carouselEmailSentAt: null })).toBe('pending')
  })

  it('says nothing at all about a paper the journal has not taken', () => {
    for (const status of ['IN_PREPARATION', 'UNDER_REVIEW', 'REVISION', 'TO_RESUBMIT', 'ABANDONED'] as const) {
      expect(carouselEmailState({ status, carouselEmailSentAt: null })).toBe('notApplicable')
    }
  })
})
