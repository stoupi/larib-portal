import { describe, it, expect } from 'vitest'
import { acceptedWindowStart, selectAcceptedPapers, type AcceptedPaper } from './accepted-recap'

function paper(id: string, date: string): AcceptedPaper {
  return { id, title: id, journalName: null, firstAuthorName: null, date, published: false }
}

describe('acceptedWindowStart', () => {
  it('walks back the asked number of months', () => {
    expect(acceptedWindowStart(new Date('2026-09-04T00:00:00.000Z'), 1).toISOString()).toBe(
      '2026-08-04T00:00:00.000Z',
    )
    expect(acceptedWindowStart(new Date('2026-09-04T00:00:00.000Z'), 4).toISOString()).toBe(
      '2026-05-04T00:00:00.000Z',
    )
  })

  it('crosses the year boundary', () => {
    expect(acceptedWindowStart(new Date('2026-02-10T00:00:00.000Z'), 4).toISOString()).toBe(
      '2025-10-10T00:00:00.000Z',
    )
  })
})

describe('selectAcceptedPapers', () => {
  const since = new Date('2026-08-04T00:00:00.000Z')

  it('keeps only what was accepted inside the window, newest first', () => {
    const selected = selectAcceptedPapers(
      [
        paper('older', '2026-07-01T00:00:00.000Z'),
        paper('middle', '2026-08-20T00:00:00.000Z'),
        paper('newest', '2026-09-01T00:00:00.000Z'),
      ],
      since,
    )
    expect(selected.map((entry) => entry.id)).toEqual(['newest', 'middle'])
  })

  it('keeps a paper accepted exactly on the boundary', () => {
    expect(selectAcceptedPapers([paper('edge', since.toISOString())], since)).toHaveLength(1)
  })

  it('returns nothing when the window is empty', () => {
    expect(selectAcceptedPapers([], since)).toEqual([])
  })
})
