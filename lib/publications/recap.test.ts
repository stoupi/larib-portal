import { describe, expect, it } from 'vitest'
import {
  selectOngoingArticles,
  selectRecapArticles,
  selectRecapCelebrations,
  selectStalledArticles,
  type RecapArticle,
} from './recap'
import type { MyPublicationItem } from '@/lib/services/publications/my-publications'

function publicationItem(overrides: Partial<MyPublicationItem>): MyPublicationItem {
  return {
    id: 'a1',
    title: 'T',
    type: 'ORIGINAL',
    status: 'UNDER_REVIEW',
    scope: 'LARIB_TEAM',
    year: null,
    studyLabel: null,
    currentJournal: 'JACC',
    currentJournalFull: 'JACC Full',
    doi: null,
    pdfUrl: null,
    order: 2,
    totalAuthors: 5,
    positionBucket: 'middle',
    isFirst: true,
    isStatistician: false,
    canDelete: false,
    authors: [],
    lastSubmissionAt: null,
    acceptedAt: null,
    pendingDays: null,
    submissions: [],
    ...overrides,
  }
}

describe('selectRecapArticles', () => {
  it('keeps only in-preparation, under-review and to-resubmit articles', () => {
    const rows = selectRecapArticles([
      publicationItem({ id: '1', status: 'IN_PREPARATION' }),
      publicationItem({ id: '2', status: 'UNDER_REVIEW' }),
      publicationItem({ id: '3', status: 'TO_RESUBMIT' }),
      publicationItem({ id: '4', status: 'ACCEPTED' }),
      publicationItem({ id: '5', status: 'PUBLISHED' }),
      publicationItem({ id: '6', status: 'ABANDONED' }),
    ])
    expect(rows.map((row: RecapArticle) => row.id)).toEqual(['1', '2', '3'])
  })

  it('exposes title, status, journal and how long it has waited', () => {
    const [row] = selectRecapArticles(
      [publicationItem({ status: 'UNDER_REVIEW', lastSubmissionAt: '2026-08-03T00:00:00.000Z' })],
      new Date('2026-09-02T00:00:00.000Z'),
    )
    expect(row).toEqual({
      id: 'a1',
      title: 'T',
      status: 'UNDER_REVIEW',
      journalName: 'JACC',
      since: '2026-08-03T00:00:00.000Z',
      waitingDays: 30,
    })
  })

  it('keeps a null journal when no target journal is known', () => {
    const [row] = selectRecapArticles([
      publicationItem({ status: 'IN_PREPARATION', currentJournal: null }),
    ])
    expect(row.journalName).toBeNull()
  })
})

describe('the recap that chases stalled papers', () => {
  const NOW = new Date('2026-09-02T00:00:00.000Z')

  it('dates a rejected paper by its refusal, not by the submission before it', () => {
    const [article] = selectRecapArticles(
      [
        publicationItem({
          id: 'r1',
          status: 'TO_RESUBMIT',
          lastSubmissionAt: '2026-01-10T00:00:00.000Z',
          submissions: [
            { id: 's1', journalName: 'Circulation', submittedAt: '2026-01-10T00:00:00.000Z', status: 'REJECTED', decidedAt: '2026-03-04T00:00:00.000Z' },
          ],
        }),
      ],
      NOW,
    )
    expect(article.since).toBe('2026-03-04T00:00:00.000Z')
    expect(article.waitingDays).toBe(182)
  })

  it('leaves a paper still being written without a waiting time', () => {
    const [article] = selectRecapArticles([publicationItem({ id: 'p1', status: 'IN_PREPARATION' })], NOW)
    expect(article.since).toBeNull()
    expect(article.waitingDays).toBeNull()
  })

  it('sorts the stalled ones with the longest wait first', () => {
    const articles = selectRecapArticles(
      [
        publicationItem({ id: 'a', status: 'TO_RESUBMIT', lastSubmissionAt: '2026-08-01T00:00:00.000Z' }),
        publicationItem({ id: 'b', status: 'TO_RESUBMIT', lastSubmissionAt: '2026-02-01T00:00:00.000Z' }),
        publicationItem({ id: 'c', status: 'UNDER_REVIEW', lastSubmissionAt: '2026-07-01T00:00:00.000Z' }),
      ],
      NOW,
    )
    expect(selectStalledArticles(articles).map((article) => article.id)).toEqual(['b', 'a'])
    expect(selectOngoingArticles(articles).map((article) => article.id)).toEqual(['c'])
  })

  it('drops the papers the reader merely signed: the recap speaks to who can act', () => {
    const articles = selectRecapArticles(
      [
        publicationItem({ id: 'co', status: 'UNDER_REVIEW', isFirst: false }),
        publicationItem({ id: 'lead', status: 'UNDER_REVIEW', isFirst: true }),
      ],
      NOW,
    )
    expect(articles.map((article) => article.id)).toEqual(['lead'])
  })
})

describe('selectRecapCelebrations', () => {
  const SINCE = new Date('2026-08-01T00:00:00.000Z')

  it('celebrates what the journal took since the last recap', () => {
    const celebrations = selectRecapCelebrations(
      [
        publicationItem({ id: 'new', status: 'ACCEPTED', acceptedAt: '2026-08-20T00:00:00.000Z' }),
        publicationItem({ id: 'old', status: 'ACCEPTED', acceptedAt: '2026-05-02T00:00:00.000Z' }),
      ],
      SINCE,
    )
    expect(celebrations.map((celebration) => celebration.id)).toEqual(['new'])
  })

  it('says nothing about a paper still under review', () => {
    expect(selectRecapCelebrations([publicationItem({ id: 'x', status: 'UNDER_REVIEW' })], SINCE)).toEqual([])
  })

  it('celebrates only what the reader signs first', () => {
    const celebrations = selectRecapCelebrations(
      [
        publicationItem({ id: 'co', status: 'PUBLISHED', isFirst: false, acceptedAt: '2026-08-25T00:00:00.000Z' }),
        publicationItem({ id: 'lead', status: 'ACCEPTED', isFirst: true, acceptedAt: '2026-08-10T00:00:00.000Z' }),
      ],
      SINCE,
    )
    expect(celebrations.map((celebration) => celebration.id)).toEqual(['lead'])
  })
})
