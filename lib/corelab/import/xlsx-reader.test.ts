import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { readWorksheets } from './xlsx-reader'

const workbook = () => readFileSync(path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures', 'corelab', 'CRF_MIR_cvi42_v2.xlsx'))

describe('readWorksheets', () => {
  it('lists every sheet of the CVI42 workbook quickly', () => {
    const started = Date.now()
    const sheets = readWorksheets(workbook(), [3, 4])
    expect(sheets.map((sheet) => sheet.name)).toContain('b_CINE')
    expect(sheets.map((sheet) => sheet.name)).toContain('f_CINE_FU1_exam')
    expect(Date.now() - started).toBeLessThan(5000)
  })

  it('reads the header row of the cine sheet by column', () => {
    const cine = readWorksheets(workbook(), [3]).find((sheet) => sheet.name === 'b_CINE')
    expect(cine?.rows.get(3)?.get('AE')).toBe('LVEF (%)')
    expect(cine?.rows.get(3)?.get('AD')).toBe('Measurable')
  })
})
