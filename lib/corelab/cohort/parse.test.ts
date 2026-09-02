import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { normaliseDate, parseCohortFile } from './parse'
import { validateCohortRows } from './validate'

const fixtures = path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures', 'corelab')

describe('normaliseDate', () => {
  it('accepts an ISO string, a French date and a JS Date', () => {
    expect(normaliseDate('2026-05-01')).toBe('2026-05-01')
    expect(normaliseDate('01/05/2026')).toBe('2026-05-01')
    expect(normaliseDate(new Date('2026-05-01T00:00:00.000Z'))).toBe('2026-05-01')
  })
})

describe('parseCohortFile', () => {
  it('reads a semicolon-separated CSV and fills the missing time labels', async () => {
    const csv = ['patient_id;centre;modality;exam_date;exam_index', 'P-001;CHU-DIJ-1;cmr;2026-05-01;1', 'P-001;CHU-DIJ-1;cmr;2026-11-01;2'].join('\n')
    const result = await parseCohortFile(Buffer.from(csv), 'cohort.csv')
    expect(result.errors).toEqual([])
    expect(result.rows[0]).toMatchObject({ patientId: 'P-001', modality: 'CMR', timeLabel: 'Baseline' })
    expect(result.rows[1].timeLabel).toBe('FU1')
  })

  it('refuses a file without the expected columns', async () => {
    const result = await parseCohortFile(Buffer.from('a,b\n1,2'), 'cohort.csv')
    expect(result.errors[0].message).toContain('missing columns')
  })

  it('reads the mixed spreadsheet fixture', async () => {
    const buffer = readFileSync(path.join(fixtures, 'cohort-mixed.xlsx'))
    const result = await parseCohortFile(buffer, 'cohort-mixed.xlsx')
    expect(result.rows).toHaveLength(7)
    expect(result.rows.every((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.examDate))).toBe(true)
  })

  it('splits the mixed fixture into four importable rows and three blocked ones', async () => {
    const buffer = readFileSync(path.join(fixtures, 'cohort-mixed.xlsx'))
    const { rows } = await parseCohortFile(buffer, 'cohort-mixed.xlsx')
    const result = validateCohortRows(rows, {
      allowedModalities: ['CMR'],
      maxExamsPerPatient: 3,
      studyStartedAt: new Date('2026-03-01T00:00:00.000Z'),
      knownSiteCodes: ['CHU-DIJ-1'],
      existingPatientExamKeys: new Set<string>(),
    })
    expect({ ready: result.ready, warnings: result.warnings, blocked: result.blocked }).toEqual({ ready: 3, warnings: 1, blocked: 3 })
    expect(result.sitesToCreate).toEqual(['CHU-NEW'])
  })
})
