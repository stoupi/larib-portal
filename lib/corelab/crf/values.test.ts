import { describe, expect, it } from 'vitest'
import {
  defaultSequenceValues, isFieldFilled, isFieldVisible, isOutOfBounds, nextSource, sequenceCompletion,
} from './values'
import type { FieldDefinition, SequenceDefinition } from './schema'
import type { FieldValue, SequenceValues } from '@/types/corelab'

const numericField: FieldDefinition = { id: 'lvef', name: 'LVEF', type: 'numeric', required: true, min: 0, max: 100 }
const booleanField: FieldDefinition = { id: 'measurable', name: 'Measurable', type: 'boolean', required: true }
const conditionalField: FieldDefinition = {
  id: 'thickness', name: 'Thickness', type: 'numeric', required: true,
  conditionalOn: { fieldId: 'measurable', value: true },
}
const segmentField: FieldDefinition = {
  id: 'wall_motion', name: 'Wall motion', type: 'segment_categorical', required: true,
  segmentCount: 17, options: ['normal', 'hypokinetic', 'akinetic'], defaultValue: 'normal',
}

function manual(value: unknown): FieldValue {
  return { value, source: 'MANUAL' }
}

describe('isFieldVisible', () => {
  it('shows a field with no condition', () => {
    expect(isFieldVisible(numericField, {})).toBe(true)
  })
  it('shows a conditional field only on a strict match', () => {
    expect(isFieldVisible(conditionalField, { measurable: manual(true) })).toBe(true)
    expect(isFieldVisible(conditionalField, { measurable: manual(false) })).toBe(false)
    expect(isFieldVisible(conditionalField, { measurable: manual('true') })).toBe(false)
    expect(isFieldVisible(conditionalField, {})).toBe(false)
  })
})

describe('isFieldFilled', () => {
  it('reads each type on its own terms', () => {
    expect(isFieldFilled(numericField, manual(0))).toBe(true)
    expect(isFieldFilled(numericField, manual(Number.NaN))).toBe(false)
    expect(isFieldFilled(numericField, undefined)).toBe(false)
    expect(isFieldFilled(booleanField, manual(false))).toBe(true)
    expect(isFieldFilled({ ...numericField, id: 'note', type: 'text' }, manual('  '))).toBe(false)
    expect(isFieldFilled({ ...numericField, id: 'series', type: 'series_availability', options: ['a'] }, manual([]))).toBe(false)
  })
  it('requires every segment of a segment map', () => {
    const complete = Object.fromEntries(Array.from({ length: 17 }, (unused, index) => [String(index + 1), 'normal']))
    expect(isFieldFilled(segmentField, manual(complete))).toBe(true)
    const partial = { ...complete, '17': null }
    expect(isFieldFilled(segmentField, manual(partial))).toBe(false)
  })
})

describe('isOutOfBounds', () => {
  it('flags a numeric value outside its bounds', () => {
    expect(isOutOfBounds(numericField, 200)).toBe(true)
    expect(isOutOfBounds(numericField, -1)).toBe(true)
    expect(isOutOfBounds(numericField, 55)).toBe(false)
    expect(isOutOfBounds(booleanField, 200)).toBe(false)
  })
})

describe('sequenceCompletion', () => {
  const sequence: SequenceDefinition = {
    id: 'cine', name: 'Cine',
    sections: [{ id: 'function', name: 'Function', fields: [numericField, booleanField, conditionalField] }],
  }
  it('ignores a required field that is hidden', () => {
    const values: SequenceValues = { lvef: manual(55), measurable: manual(false) }
    expect(sequenceCompletion(sequence, values)).toEqual({ required: 2, filled: 2, missing: [] })
  })
  it('counts a visible required field that is still empty', () => {
    const values: SequenceValues = { lvef: manual(55), measurable: manual(true) }
    expect(sequenceCompletion(sequence, values)).toEqual({ required: 3, filled: 2, missing: ['thickness'] })
  })
})

describe('defaultSequenceValues', () => {
  it('spreads a segment default over every segment', () => {
    const sequence: SequenceDefinition = { id: 'cine', name: 'Cine', sections: [{ id: 's', name: 'S', fields: [segmentField, numericField] }] }
    const values = defaultSequenceValues(sequence)
    expect(Object.keys(values)).toEqual(['wall_motion'])
    expect(Object.keys(values.wall_motion.value as Record<string, unknown>)).toHaveLength(17)
    expect((values.wall_motion.value as Record<string, unknown>)['17']).toBe('normal')
  })
})

describe('nextSource', () => {
  it('marks an imported value as modified, and leaves a manual one alone', () => {
    expect(nextSource('IMPORTED')).toBe('MODIFIED')
    expect(nextSource('MODIFIED')).toBe('MODIFIED')
    expect(nextSource('MANUAL')).toBe('MANUAL')
    expect(nextSource(undefined)).toBe('MANUAL')
  })
})
