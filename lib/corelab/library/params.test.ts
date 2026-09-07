import { describe, expect, it } from 'vitest'
import { parseVariableParams, variableToFieldDefinition } from './params'

describe('parseVariableParams', () => {
  it('keeps the constraints a variable carries and defaults the rest', () => {
    const params = parseVariableParams({
      required: true, unit: '%', min: 10, max: 80,
      calibrationTolerance: { absolute: 5, relativePercent: 8 },
      discordanceThreshold: { minorPercent: 5, majorPercent: 10 },
    })
    expect(params).toMatchObject({
      required: true, unit: '%', min: 10, max: 80,
      calibrationTolerance: { absolute: 5, relativePercent: 8 },
      discordanceThreshold: { minorPercent: 5, majorPercent: 10 },
    })
  })

  it('reads an absent or malformed blob as an optional variable with no constraint', () => {
    expect(parseVariableParams(null)).toEqual({ required: false })
    expect(parseVariableParams({ min: 'ten' })).toEqual({ required: false })
  })

  it('carries a conditional display and a default value through', () => {
    const params = parseVariableParams({
      required: true,
      defaultValue: 'Normal',
      conditionalOn: { fieldId: 'lv_measurable', value: true },
    })
    expect(params.defaultValue).toBe('Normal')
    expect(params.conditionalOn).toEqual({ fieldId: 'lv_measurable', value: true })
  })
})

describe('variableToFieldDefinition', () => {
  const numeric = { code: 'lvef', name: 'LVEF', type: 'numeric', params: { required: true, unit: '%', min: 10, max: 80, calibrationTolerance: { absolute: 5, relativePercent: 8 }, discordanceThreshold: { minorPercent: 5, majorPercent: 10 } } }

  it('turns a variable into the field a reader fills, tolerance and threshold included', () => {
    const field = variableToFieldDefinition(numeric, [])
    expect(field).toMatchObject({
      id: 'lvef', name: 'LVEF', type: 'numeric', required: true, unit: '%', min: 10, max: 80,
      calibrationTolerance: { absolute: 5, relativePercent: 8 },
      discordanceThreshold: { minorPercent: 5, majorPercent: 10 },
    })
  })

  it('turns the value set items into options and their colours', () => {
    const field = variableToFieldDefinition(
      { code: 'wall_motion_segments', name: 'Wall Motion Segments', type: 'segment_categorical', params: { required: true, segmentCount: 17, defaultValue: 'Normal' } },
      [{ code: 'normal', label: 'Normal', colour: '#ECFDF5' }, { code: 'akinetic', label: 'Akinetic', colour: null }],
    )
    expect(field.options).toEqual(['Normal', 'Akinetic'])
    expect(field.optionColours).toEqual({ Normal: '#ECFDF5' })
    expect(field.segmentCount).toBe(17)
    expect(field.defaultValue).toBe('Normal')
  })

  it('carries the guidance a data manager wrote for the reader', () => {
    const field = variableToFieldDefinition(
      { ...numeric, params: { required: true, guidance: { level: 'WARNING', text: 'Mesurer en télédiastole.', imageKey: 'corelab/library/guidance/x.png' } } },
      [],
    )
    expect(field.guidance).toEqual({ level: 'WARNING', text: 'Mesurer en télédiastole.', imageKey: 'corelab/library/guidance/x.png' })
  })

  it('drops a guidance with no text rather than showing an empty bubble', () => {
    const field = variableToFieldDefinition({ ...numeric, params: { required: true, guidance: { level: 'INFO', text: '' } } }, [])
    expect(field.guidance).toBeUndefined()
  })

  it('refuses a variable whose code could never be a field id', () => {
    expect(() => variableToFieldDefinition({ ...numeric, code: 'LVEF ratio' }, [])).toThrow()
  })
})
