import { describe, expect, it } from 'vitest'
import { MIR_DIJON_CVI42_MAPPINGS, sheetForExam, sheetKeyForSequence } from './mapping'

describe('sheetForExam', () => {
  it('points at the baseline sheet for the first exam', () => {
    expect(sheetForExam(1, 'CINE').test('b_CINE')).toBe(true)
    expect(sheetForExam(1, 'CINE').test('f_CINE_FU1_exam')).toBe(false)
  })
  it('points at the follow-up sheet for the next exams', () => {
    expect(sheetForExam(2, 'CINE').test('f_CINE_FU1_exam')).toBe(true)
    expect(sheetForExam(3, 'LGE').test('f_LGE_FU2_exam')).toBe(true)
  })
  it('accepts a space or an underscore in the sequence key', () => {
    expect(sheetForExam(1, 'T2 mapping').test('b_T2 mapping')).toBe(true)
    expect(sheetForExam(3, 'T2 mapping').test('f_T2_mapping_FU2_exam')).toBe(true)
  })
})

describe('MIR_DIJON_CVI42_MAPPINGS', () => {
  it('maps each column of a sheet only once', () => {
    const keys = MIR_DIJON_CVI42_MAPPINGS.map((entry) => `${entry.sheetKey}!${entry.column}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('knows the sheet of every mapped sequence', () => {
    for (const entry of MIR_DIJON_CVI42_MAPPINGS) {
      expect(sheetKeyForSequence(entry.sequenceId)).toBe(entry.sheetKey)
    }
  })
})
