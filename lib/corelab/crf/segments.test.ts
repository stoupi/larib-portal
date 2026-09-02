import { describe, expect, it } from 'vitest'
import { compareSegmentMaps, segmentTolerance } from './segments'
import type { FieldDefinition } from './schema'

const field: FieldDefinition = {
  id: 'wall_motion', name: 'Wall motion', type: 'segment_categorical', required: true,
  segmentCount: 17, options: ['normal', 'hypokinetic'],
}

function map(overrides: Record<string, unknown> = {}) {
  return { ...Object.fromEntries(Array.from({ length: 17 }, (unused, index) => [String(index + 1), 'normal'])), ...overrides }
}

describe('compareSegmentMaps', () => {
  it('finds no discordance between two identical maps', () => {
    expect(compareSegmentMaps(map(), map(), 17)).toEqual({ discordant: [], count: 0 })
  })
  it('lists the discordant segments in order', () => {
    const other = map({ '8': 'hypokinetic', '9': 'hypokinetic', '14': 'hypokinetic' })
    expect(compareSegmentMaps(map(), other, 17)).toEqual({ discordant: [8, 9, 14], count: 3 })
  })
  it('treats a missing map as fully discordant', () => {
    expect(compareSegmentMaps(map(), undefined, 17).count).toBe(17)
    expect(compareSegmentMaps(undefined, undefined, 16).count).toBe(0)
  })
})

describe('segmentTolerance', () => {
  it('rounds the absolute tolerance, and defaults to one segment', () => {
    expect(segmentTolerance(field)).toBe(1)
    expect(segmentTolerance({ ...field, calibrationTolerance: { absolute: 2.4, relativePercent: 20 } })).toBe(2)
  })
})
