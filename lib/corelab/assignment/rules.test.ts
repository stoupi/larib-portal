import { describe, expect, it } from 'vitest'
import { canValidateDraft, computePace, pairDistribution, pairKey, readerCandidates, reviewerCandidates } from './rules'

const members = [
  { userId: 'u1', canRead: true, canAdjudicate: true, canAuthorReference: false, certificationPhase: 'PRODUCTION' as const },
  { userId: 'u2', canRead: true, canAdjudicate: false, canAuthorReference: false, certificationPhase: 'PRODUCTION' as const },
  { userId: 'u3', canRead: true, canAdjudicate: false, canAuthorReference: false, certificationPhase: 'TRAINING' as const },
  { userId: 'u4', canRead: false, canAdjudicate: false, canAuthorReference: true, certificationPhase: 'PRODUCTION' as const },
]

describe('pairKey', () => {
  it('does not depend on the order of the two readers', () => {
    expect(pairKey('b', 'a')).toBe(pairKey('a', 'b'))
  })
})

describe('pairDistribution', () => {
  it('sorts the pairs from the least to the most used', () => {
    const distribution = pairDistribution([
      { readers: ['u1', 'u2'], examCount: 2 },
      { readers: ['u1', 'u2'], examCount: 1 },
      { readers: ['u1', 'u3'], examCount: 2 },
    ])
    expect(distribution).toEqual([
      { pair: pairKey('u1', 'u3'), patients: 1, exams: 2 },
      { pair: pairKey('u1', 'u2'), patients: 2, exams: 3 },
    ])
  })
  it('ignores a patient with a single reader', () => {
    expect(pairDistribution([{ readers: ['u1'], examCount: 1 }])).toEqual([])
  })
})

describe('readerCandidates', () => {
  it('keeps the certified readers only', () => {
    expect(readerCandidates(members).map((member) => member.userId)).toEqual(['u1', 'u2'])
  })
})

describe('reviewerCandidates', () => {
  it('offers adjudicators and reference authors, never a reader of the patient', () => {
    expect(reviewerCandidates(members, ['u1']).map((member) => member.userId)).toEqual(['u4'])
    expect(reviewerCandidates(members, []).map((member) => member.userId)).toEqual(['u1', 'u4'])
  })
})

describe('computePace', () => {
  it('spreads twenty patients over four weeks', () => {
    const pace = computePace(20, new Date('2026-04-01T00:00:00.000Z'), new Date('2026-03-04T00:00:00.000Z'))
    expect(pace).toEqual({ amount: 5, unit: 'week' })
  })
  it('falls back to a monthly pace on a long horizon', () => {
    const pace = computePace(10, new Date('2026-09-01T00:00:00.000Z'), new Date('2026-03-01T00:00:00.000Z'))
    expect(pace.unit).toBe('month')
  })
})

describe('canValidateDraft', () => {
  it('accepts a single reading with one reader', () => {
    expect(canValidateDraft({ readingMode: 'SINGLE', reader1: 'u1' })).toBe(true)
    expect(canValidateDraft({ readingMode: 'SINGLE' })).toBe(false)
  })
  it('refuses a double reading with the same reader twice', () => {
    expect(canValidateDraft({ readingMode: 'DOUBLE', reader1: 'u1', reader2: 'u1' })).toBe(false)
    expect(canValidateDraft({ readingMode: 'DOUBLE', reader1: 'u1', reader2: 'u2' })).toBe(true)
  })
  it('refuses a reviewer who also reads the patient', () => {
    expect(canValidateDraft({ readingMode: 'DOUBLE', reader1: 'u1', reader2: 'u2', reviewer: 'u1' })).toBe(false)
    expect(canValidateDraft({ readingMode: 'DOUBLE', reader1: 'u1', reader2: 'u2', reviewer: 'u4' })).toBe(true)
  })
})
