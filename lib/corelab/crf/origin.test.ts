import { describe, expect, it } from 'vitest'
import { driftCount, fieldDiffs, fieldOrigin, revertToReference } from './origin'
import type { FieldDefinition } from './schema'

const lvef: FieldDefinition = {
  id: 'lvef',
  name: 'LVEF',
  type: 'numeric',
  required: true,
  unit: '%',
  min: 10,
  max: 80,
  calibrationTolerance: { absolute: 5, relativePercent: 8 },
}

const grade: FieldDefinition = {
  id: 'artefacts_grade',
  name: 'Artefacts Grade',
  type: 'categorical',
  required: true,
  options: ['0', '1', '2'],
}

describe('fieldOrigin', () => {
  it('reads a field with no library counterpart as study only', () => {
    expect(fieldOrigin(lvef, null)).toBe('STUDY_ONLY')
  })

  it('reads an untouched copy as identical to the library', () => {
    expect(fieldOrigin(lvef, { ...lvef })).toBe('LIBRARY')
  })

  it('reads a narrowed bound as tuned', () => {
    expect(fieldOrigin({ ...lvef, min: 15 }, lvef)).toBe('TUNED')
  })

  it('ignores the condition, which is set where the block is composed', () => {
    const conditional = { ...lvef, conditionalOn: { fieldId: 'lv_measurable', value: true } }
    expect(fieldOrigin(conditional, lvef)).toBe('LIBRARY')
  })

  it('compares option lists by content and order', () => {
    expect(fieldOrigin({ ...grade, options: ['0', '1', '2'] }, grade)).toBe('LIBRARY')
    expect(fieldOrigin({ ...grade, options: ['2', '1', '0'] }, grade)).toBe('TUNED')
    expect(fieldOrigin({ ...grade, options: ['0', '1'] }, grade)).toBe('TUNED')
  })

  it('compares nested tolerances by value, not by reference', () => {
    const copy = { ...lvef, calibrationTolerance: { absolute: 5, relativePercent: 8 } }
    expect(fieldOrigin(copy, lvef)).toBe('LIBRARY')
    const widened = { ...lvef, calibrationTolerance: { absolute: 9, relativePercent: 8 } }
    expect(fieldOrigin(widened, lvef)).toBe('TUNED')
  })
})

describe('fieldDiffs', () => {
  it('names what changed, from which value to which', () => {
    expect(fieldDiffs({ ...lvef, min: 15, required: false }, lvef)).toEqual([
      { key: 'required', from: true, to: false },
      { key: 'min', from: 10, to: 15 },
    ])
  })

  it('reports a value the study added and the library does not carry', () => {
    expect(fieldDiffs({ ...lvef, unit: 'ratio' }, { ...lvef, unit: undefined })).toEqual([
      { key: 'unit', from: undefined, to: 'ratio' },
    ])
  })

  it('says nothing about an untouched copy', () => {
    expect(fieldDiffs({ ...lvef }, lvef)).toEqual([])
  })
})

describe('driftCount', () => {
  it('counts the variables that left the library behind', () => {
    const references = new Map<string, FieldDefinition>([['lvef', lvef], ['artefacts_grade', grade]])
    const fields = [{ ...lvef, min: 15 }, grade, { ...lvef, id: 'lv_strain', name: 'LV Strain' }]
    expect(driftCount(fields, references)).toBe(2)
  })
})

describe('revertToReference', () => {
  it('restores every compared value and keeps the rest', () => {
    const tuned: FieldDefinition = {
      ...lvef,
      min: 15,
      name: 'LVEF (Dijon)',
      conditionalOn: { fieldId: 'lv_measurable', value: true },
    }
    const restored = revertToReference(tuned, lvef)
    expect(restored.min).toBe(10)
    expect(restored.name).toBe('LVEF')
    expect(restored.conditionalOn).toEqual({ fieldId: 'lv_measurable', value: true })
    expect(fieldOrigin(restored, lvef)).toBe('LIBRARY')
  })

  it('drops a value the study added when the library carries none', () => {
    const restored = revertToReference({ ...lvef, unit: 'ratio' }, { ...lvef, unit: undefined })
    expect(restored.unit).toBeUndefined()
    expect('unit' in restored).toBe(false)
  })
})
