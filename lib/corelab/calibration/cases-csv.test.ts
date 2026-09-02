import { describe, expect, it } from 'vitest'
import { parseCalibrationCasesCsv } from './cases-csv'

const header = 'caseId,examIndex,examDate,timeLabel'

describe('parseCalibrationCasesCsv', () => {
  it('groups the rows of one case into its exams', () => {
    const csv = [header, 'CAL-001,1,2026-01-14,Baseline', 'CAL-001,2,2026-07-18,6 months', 'CAL-002,1,2026-02-03,Baseline'].join('\n')
    expect(parseCalibrationCasesCsv(csv)).toEqual({
      cases: [
        { code: 'CAL-001', exams: [{ index: 1, date: '2026-01-14', timeLabel: 'Baseline' }, { index: 2, date: '2026-07-18', timeLabel: '6 months' }] },
        { code: 'CAL-002', exams: [{ index: 1, date: '2026-02-03', timeLabel: 'Baseline' }] },
      ],
      errors: [],
    })
  })
  it('reports a missing column, a bad date and a bad index', () => {
    const csv = [header, 'CAL-001,x,2026-01-14,Baseline', 'CAL-002,1,14/01/2026,Baseline', 'CAL-003,1'].join('\n')
    const result = parseCalibrationCasesCsv(csv)
    expect(result.cases).toEqual([])
    expect(result.errors).toHaveLength(3)
    expect(result.errors[0]).toContain('2')
  })
  it('refuses a file without the expected header', () => {
    expect(parseCalibrationCasesCsv('a,b,c\n1,2,3').errors[0]).toContain('header')
  })
  it('ignores blank lines and trims cells', () => {
    const csv = [header, ' CAL-001 , 1 , 2026-01-14 , Baseline ', '', '  '].join('\n')
    expect(parseCalibrationCasesCsv(csv).cases).toEqual([
      { code: 'CAL-001', exams: [{ index: 1, date: '2026-01-14', timeLabel: 'Baseline' }] },
    ])
  })
})
