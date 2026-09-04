import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { convert, extractValues } from './excel'
import { MIR_DIJON_CVI42_MAPPINGS } from './mapping'
import { MIR_DIJON_CRF_V1 } from '@/lib/corelab/crf/mir-dijon-v1'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

const lvef: FieldDefinition = { id: 'lvef', name: 'LVEF', type: 'numeric', required: true, min: 10, max: 80 }
const measurable: FieldDefinition = { id: 'lv_measurable', name: 'Measurable', type: 'boolean', required: true }
const grade: FieldDefinition = { id: 'artefacts_grade', name: 'Grade', type: 'categorical', required: true, options: ['0', '1', '2'] }

describe('convert', () => {
  it('reads a number written with a comma', () => {
    expect(convert(lvef, '52,4')).toEqual({ value: 52.4, issue: undefined })
  })
  it('flags a number outside the field bounds', () => {
    expect(convert(lvef, 999)).toEqual({ value: 999, issue: 'OUT_OF_BOUNDS' })
  })
  it('reads yes and non as booleans, and refuses anything else', () => {
    expect(convert(measurable, 'Yes').value).toBe(true)
    expect(convert(measurable, 'non').value).toBe(false)
    expect(convert(measurable, 'maybe')).toEqual({ value: null, issue: 'UNPARSEABLE' })
  })
  it('matches a categorical option regardless of case, and reports an unknown one', () => {
    expect(convert(grade, '1').value).toBe('1')
    expect(convert(grade, '9')).toEqual({ value: null, issue: 'UNKNOWN_OPTION' })
  })
  it('reads an empty cell as nothing at all', () => {
    expect(convert(lvef, '')).toEqual({ value: null })
  })
})

describe('extractValues', () => {
  const fixture = (name: string) => readFileSync(path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures', 'corelab', name))
  const workbook = () => fixture('CRF_MIR_cvi42_v2.xlsx')
  const filled = () => fixture('cvi42-filled.xlsx')

  it('finds the baseline sheets of the CVI42 workbook', async () => {
    const report = await extractValues(workbook(), 1, MIR_DIJON_CVI42_MAPPINGS, MIR_DIJON_CRF_V1.sequences)
    expect(report.missingSheets).toEqual([])
  })

  it('leaves the segment fields unmatched', async () => {
    const report = await extractValues(workbook(), 1, MIR_DIJON_CVI42_MAPPINGS, MIR_DIJON_CRF_V1.sequences)
    const unmatched = report.unmatchedFields.map((field) => field.fieldId)
    expect(unmatched).toContain('lge_segments')
    expect(unmatched).toContain('wall_motion_segments')
  })

  it('reads the follow-up sheets for the second exam', async () => {
    const report = await extractValues(workbook(), 2, MIR_DIJON_CVI42_MAPPINGS, MIR_DIJON_CRF_V1.sequences)
    expect(report.missingSheets).toEqual([])
  })

  it('extracts the filled workbook without a single conversion issue', async () => {
    const report = await extractValues(filled(), 1, MIR_DIJON_CVI42_MAPPINGS, MIR_DIJON_CRF_V1.sequences)
    expect(report.cells.length).toBeGreaterThanOrEqual(20)
    expect(report.cells.filter((cell) => cell.issue)).toEqual([])
    expect(report.cells.find((cell) => cell.fieldId === 'lvef')?.value).toBe(52)
    expect(report.cells.find((cell) => cell.fieldId === 'lv_measurable')?.value).toBe(true)
  })

  it('reads the follow-up sheets of the filled workbook for the second exam', async () => {
    const report = await extractValues(filled(), 2, MIR_DIJON_CVI42_MAPPINGS, MIR_DIJON_CRF_V1.sequences)
    expect(report.missingSheets).toEqual([])
    expect(report.cells.length).toBeGreaterThanOrEqual(20)
  })
}, 60000)
