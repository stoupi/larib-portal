import { describe, it, expect } from 'vitest'
import { siblingsToReject, articleStatusForSubmission, articleStatusBackfill } from './submission-rules'

describe('siblingsToReject', () => {
  const subs = [
    { id: 'a', status: 'REJECTED' as const },
    { id: 'b', status: 'UNDER_REVIEW' as const },
    { id: 'c', status: 'SUBMITTED' as const },
  ]

  it('rejects other still-active submissions when one becomes active', () => {
    expect(siblingsToReject(subs, 'c')).toEqual(['b'])
  })

  it('never re-rejects an already rejected sibling', () => {
    expect(siblingsToReject(subs, 'b')).toEqual(['c'])
  })

  it('returns nothing when there are no other active submissions', () => {
    expect(siblingsToReject([{ id: 'x', status: 'SUBMITTED' as const }], 'x')).toEqual([])
  })
})

describe('articleStatusForSubmission', () => {
  it('keeps the publication under review while the journal has not decided', () => {
    expect(articleStatusForSubmission('SUBMITTED', 'IN_PREPARATION')).toBe('UNDER_REVIEW')
    expect(articleStatusForSubmission('UNDER_REVIEW', 'IN_PREPARATION')).toBe('UNDER_REVIEW')
  })

  it('moves it to revision when the journal asks for changes, minor or major', () => {
    expect(articleStatusForSubmission('MINOR_REVISIONS', 'UNDER_REVIEW')).toBe('REVISION')
    expect(articleStatusForSubmission('MAJOR_REVISIONS', 'UNDER_REVIEW')).toBe('REVISION')
  })

  it('accepts the publication and sends a rejected one back to the resubmit pile', () => {
    expect(articleStatusForSubmission('ACCEPTED', 'UNDER_REVIEW')).toBe('ACCEPTED')
    expect(articleStatusForSubmission('REJECTED', 'UNDER_REVIEW')).toBe('TO_RESUBMIT')
  })

  it('asks for no write when the publication already carries that status', () => {
    expect(articleStatusForSubmission('UNDER_REVIEW', 'UNDER_REVIEW')).toBeNull()
    expect(articleStatusForSubmission('MINOR_REVISIONS', 'REVISION')).toBeNull()
  })

  it('never drags a published or abandoned paper back into the pipeline', () => {
    expect(articleStatusForSubmission('REJECTED', 'PUBLISHED')).toBeNull()
    expect(articleStatusForSubmission('ACCEPTED', 'PUBLISHED')).toBeNull()
    expect(articleStatusForSubmission('SUBMITTED', 'ABANDONED')).toBeNull()
  })
})

describe('articleStatusBackfill', () => {
  it('catches up a publication left behind by its submission', () => {
    expect(articleStatusBackfill('ACCEPTED', 'UNDER_REVIEW')).toBe('ACCEPTED')
    expect(articleStatusBackfill('MAJOR_REVISIONS', 'TO_RESUBMIT')).toBe('REVISION')
    expect(articleStatusBackfill('REJECTED', 'IN_PREPARATION')).toBe('TO_RESUBMIT')
  })

  it('never takes back an acceptance recorded by hand', () => {
    expect(articleStatusBackfill('UNDER_REVIEW', 'ACCEPTED')).toBeNull()
    expect(articleStatusBackfill('REJECTED', 'ACCEPTED')).toBeNull()
  })

  it('leaves published and abandoned papers alone, like the live rule', () => {
    expect(articleStatusBackfill('ACCEPTED', 'PUBLISHED')).toBeNull()
    expect(articleStatusBackfill('SUBMITTED', 'ABANDONED')).toBeNull()
  })
})
