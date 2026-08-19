import { describe, it, expect } from 'vitest'
import { pendingDelay, isPendingOverAMonth } from './pending-delay'

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
