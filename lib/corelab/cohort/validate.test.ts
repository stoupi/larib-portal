import { describe, expect, it } from 'vitest'
import { validateCohortRows, type CohortRow } from './validate'

function row(over: Partial<CohortRow> = {}): CohortRow {
  return { line: 2, patientId: 'P-001', centreCode: 'CHU-DIJ-1', modality: 'CMR', examDate: '2026-05-01', examIndex: 1, timeLabel: 'Baseline', ...over }
}

const context = {
  allowedModalities: ['CMR'],
  maxExamsPerPatient: 3,
  studyStartedAt: new Date('2026-03-01T00:00:00.000Z'),
  knownSiteCodes: ['CHU-DIJ-1'],
  existingPatientExamKeys: new Set<string>(),
}

describe('validateCohortRows', () => {
  it('accepts a clean row', () => {
    const result = validateCohortRows([row()], context)
    expect(result.ready).toBe(1)
    expect(result.rows[0].verdict).toBe('READY')
  })
  it('blocks a duplicated patient and index inside the file', () => {
    const result = validateCohortRows([row(), row({ line: 3 })], context)
    expect(result.blocked).toBe(2)
    expect(result.rows[1].issues[0].code).toBe('DUPLICATE')
  })
  it('blocks an unknown modality, an index above the study limit and a bad date', () => {
    const result = validateCohortRows(
      [row({ modality: 'PET' }), row({ line: 3, patientId: 'P-002', examIndex: 9 }), row({ line: 4, patientId: 'P-003', examDate: '01/05/2026' })],
      context,
    )
    expect(result.rows.map((entry) => entry.issues[0].code)).toEqual(['UNKNOWN_MODALITY', 'INDEX_TOO_HIGH', 'BAD_DATE'])
    expect(result.blocked).toBe(3)
  })
  it('blocks a patient exam already in the database', () => {
    const result = validateCohortRows([row()], { ...context, existingPatientExamKeys: new Set(['P-001#1']) })
    expect(result.rows[0].issues[0].code).toBe('PATIENT_EXISTS')
  })
  it('only warns on an unknown site and a date before the study started', () => {
    const result = validateCohortRows([row({ centreCode: 'CHU-NEW' }), row({ line: 3, patientId: 'P-002', examDate: '2026-01-05' })], context)
    expect(result.rows.map((entry) => entry.verdict)).toEqual(['WARNING', 'WARNING'])
    expect(result.warnings).toBe(2)
    expect(result.sitesToCreate).toEqual(['CHU-NEW'])
  })
})
