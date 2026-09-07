import { describe, expect, it } from 'vitest'
import { variableToField, type LibraryVariable } from './library'

const variable = (params: LibraryVariable['params'], type = 'numeric'): LibraryVariable => ({
  id: 'v1', code: 'lvef', name: 'LVEF', modality: 'CMR', type, params, deprecated: false, valueSet: null,
})

describe('variableToField', () => {
  it('carries the calibration tolerance and the numeric constraints of the library variable', () => {
    const field = variableToField(
      variable({ required: true, unit: '%', min: 10, max: 80, calibrationTolerance: { absolute: 5, relativePercent: 8 } }),
      [],
    )
    expect(field).toMatchObject({
      id: 'lvef', type: 'numeric', required: true, unit: '%', min: 10, max: 80,
      calibrationTolerance: { absolute: 5, relativePercent: 8 },
    })
  })

  it('turns the value set items into options and their colours', () => {
    const field = variableToField(
      variable({ required: true, segmentCount: 17 }, 'segment_categorical'),
      [{ code: 'normal', label: 'Normal', colour: '#ECFDF5' }, { code: 'akinetic', label: 'Akinetic', colour: null }],
    )
    expect(field.options).toEqual(['Normal', 'Akinetic'])
    expect(field.optionColours).toEqual({ Normal: '#ECFDF5' })
    expect(field.segmentCount).toBe(17)
  })
})
