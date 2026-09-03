import { describe, it, expect } from 'vitest'
import { pendingDelay, isPendingOverAMonth, pendingSince } from './pending-delay'

describe('pendingDelay', () => {
  it('counts in days up to a month', () => {
    expect(pendingDelay(0)).toEqual({ unit: 'days', days: 0 })
    expect(pendingDelay(12)).toEqual({ unit: 'days', days: 12 })
    expect(pendingDelay(30)).toEqual({ unit: 'days', days: 30 })
  })

  it('switches to months past a month', () => {
    expect(pendingDelay(31)).toEqual({ unit: 'months', months: 1 })
    expect(pendingDelay(59)).toEqual({ unit: 'months', months: 2 })
    expect(pendingDelay(143)).toEqual({ unit: 'months', months: 5 })
  })

  it('rounds to the nearest month rather than truncating', () => {
    expect(pendingDelay(44)).toEqual({ unit: 'months', months: 1 })
    expect(pendingDelay(46)).toEqual({ unit: 'months', months: 2 })
  })
})

describe('isPendingOverAMonth', () => {
  it('is false without a pending delay and up to a month', () => {
    expect(isPendingOverAMonth(null)).toBe(false)
    expect(isPendingOverAMonth(30)).toBe(false)
  })

  it('is true past a month', () => {
    expect(isPendingOverAMonth(31)).toBe(true)
  })
})

describe('pendingSince', () => {
  const submitted = new Date('2026-08-30T00:00:00.000Z')
  const rejected = new Date('2026-09-03T00:00:00.000Z')

  it('counts a refused paper from the refusal', () => {
    expect(
      pendingSince({
        status: 'TO_RESUBMIT',
        submissions: [{ decidedAt: rejected }],
        lastSubmissionAt: submitted,
      }),
    ).toEqual(rejected)
  })

  it('takes the latest decision when several submissions were decided', () => {
    const older = new Date('2026-05-01T00:00:00.000Z')
    expect(
      pendingSince({
        status: 'TO_RESUBMIT',
        submissions: [{ decidedAt: older }, { decidedAt: rejected }, { decidedAt: null }],
        lastSubmissionAt: submitted,
      }),
    ).toEqual(rejected)
  })

  it('falls back to the submission when no decision is dated', () => {
    expect(
      pendingSince({ status: 'TO_RESUBMIT', submissions: [{ decidedAt: null }], lastSubmissionAt: submitted }),
    ).toEqual(submitted)
  })

  it('counts a paper still under review from its submission', () => {
    expect(
      pendingSince({ status: 'UNDER_REVIEW', submissions: [{ decidedAt: rejected }], lastSubmissionAt: submitted }),
    ).toEqual(submitted)
  })
})
