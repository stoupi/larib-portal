import { describe, expect, it } from 'vitest'
import { endOfDayUtc, startOfDayUtc } from './access-periods'

describe('access period day bounds', () => {
  it('starts at midnight UTC', () => {
    expect(startOfDayUtc('2026-09-15').toISOString()).toBe('2026-09-15T00:00:00.000Z')
  })
  it('ends at the last millisecond of the day UTC', () => {
    expect(endOfDayUtc('2026-01-31').toISOString()).toBe('2026-01-31T23:59:59.999Z')
  })
})
