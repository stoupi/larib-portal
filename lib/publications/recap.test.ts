import { describe, expect, it } from 'vitest'
import { selectRecapArticles, type RecapArticle } from './recap'
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
    isFirst: false,
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

  it('exposes title, status, journal and author position', () => {
    const [row] = selectRecapArticles([publicationItem({ status: 'UNDER_REVIEW' })])
    expect(row).toEqual({
      id: 'a1',
      title: 'T',
      status: 'UNDER_REVIEW',
      journalName: 'JACC',
      order: 2,
      totalAuthors: 5,
    })
  })

  it('keeps a null journal when no target journal is known', () => {
    const [row] = selectRecapArticles([
      publicationItem({ status: 'IN_PREPARATION', currentJournal: null }),
    ])
    expect(row.journalName).toBeNull()
  })
})
