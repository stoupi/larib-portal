import { describe, expect, it } from 'vitest'
import { compareToGoldStandard } from './tolerance'
import type { FieldDefinition } from './schema'

const lvef: FieldDefinition = { id: 'lvef', name: 'LVEF', type: 'numeric', required: true, calibrationTolerance: { absolute: 5, relativePercent: 8 } }
const lvesv: FieldDefinition = { id: 'lv_esv', name: 'LV ESV', type: 'numeric', required: true, calibrationTolerance: { absolute: 15, relativePercent: 10 } }
const lgeMass: FieldDefinition = { id: 'lge_mass', name: 'LGE mass', type: 'numeric', required: true, calibrationTolerance: { absolute: 3, relativePercent: 15 } }
const effusion: FieldDefinition = { id: 'effusion', name: 'Effusion', type: 'boolean', required: true }
const comment: FieldDefinition = { id: 'comment', name: 'Comment', type: 'text', required: false }

describe('compareToGoldStandard', () => {
  it('accepts a gap inside the absolute tolerance', () => {
    expect(compareToGoldStandard(lvef, 48, 52)).toEqual({ delta: -4, withinTolerance: true, rule: 'absolute' })
    expect(compareToGoldStandard(lvesv, 91, 82)).toEqual({ delta: 9, withinTolerance: true, rule: 'absolute' })
  })
  it('accepts a gap inside the relative tolerance alone', () => {
    const verdict = compareToGoldStandard(lvesv, 220, 200)
    expect(verdict.withinTolerance).toBe(true)
    expect(verdict.rule).toBe('relative')
  })
  it('rejects a gap outside both tolerances', () => {
    const verdict = compareToGoldStandard(lgeMass, 8, 14)
    expect(verdict.withinTolerance).toBe(false)
    expect(verdict.delta).toBe(-6)
  })
  it('compares booleans exactly', () => {
    expect(compareToGoldStandard(effusion, true, false)).toEqual({ delta: null, withinTolerance: false, rule: 'exact' })
    expect(compareToGoldStandard(effusion, true, true)).toEqual({ delta: null, withinTolerance: true, rule: 'exact' })
  })
  it('never compares free text', () => {
    expect(compareToGoldStandard(comment, 'a', 'b').rule).toBe('not_compared')
  })
  it('treats two zeros as equal without dividing by zero', () => {
    const verdict = compareToGoldStandard(lvef, 0, 0)
    expect(verdict.withinTolerance).toBe(true)
    expect(verdict.delta).toBe(0)
  })
  it('does not compare a missing value', () => {
    expect(compareToGoldStandard(lvef, null, 52).rule).toBe('not_compared')
  })
})
