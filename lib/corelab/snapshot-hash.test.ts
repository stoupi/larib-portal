import { describe, expect, it } from 'vitest'
import { snapshotHash } from './snapshot-hash'

describe('snapshotHash', () => {
  it('is stable across key order', () => {
    expect(snapshotHash({ b: 1, a: [1, 2] })).toBe(snapshotHash({ a: [1, 2], b: 1 }))
  })
  it('changes when a value changes', () => {
    expect(snapshotHash({ a: 1 })).not.toBe(snapshotHash({ a: 2 }))
  })
  it('is a 64-character hex string', () => {
    expect(snapshotHash({})).toMatch(/^[0-9a-f]{64}$/)
  })
})
