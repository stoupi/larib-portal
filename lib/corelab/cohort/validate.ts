export type CohortRow = {
  line: number
  patientId: string
  centreCode: string
  modality: string
  examDate: string
  examIndex: number
  timeLabel: string
}

export type RowVerdict = 'READY' | 'WARNING' | 'BLOCKED'
export type RowIssueCode =
  | 'DUPLICATE' | 'UNKNOWN_MODALITY' | 'INDEX_TOO_HIGH' | 'DATE_BEFORE_STUDY' | 'NEW_SITE' | 'BAD_DATE' | 'PATIENT_EXISTS'
export type RowIssue = { code: RowIssueCode; message: string }
export type ValidatedRow = CohortRow & { verdict: RowVerdict; issues: RowIssue[] }

export type ValidationContext = {
  allowedModalities: string[]
  maxExamsPerPatient: number
  studyStartedAt: Date | null
  knownSiteCodes: string[]
  existingPatientExamKeys: Set<string>
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const BLOCKING: RowIssueCode[] = ['DUPLICATE', 'UNKNOWN_MODALITY', 'INDEX_TOO_HIGH', 'BAD_DATE', 'PATIENT_EXISTS']

export function examKey(patientId: string, examIndex: number): string {
  return `${patientId}#${examIndex}`
}

export function validateCohortRows(
  rows: CohortRow[],
  context: ValidationContext,
): { rows: ValidatedRow[]; ready: number; warnings: number; blocked: number; sitesToCreate: string[] } {
  const seen = new Map<string, number[]>()
  for (const row of rows) {
    const key = examKey(row.patientId, row.examIndex)
    seen.set(key, [...(seen.get(key) ?? []), row.line])
  }

  const sitesToCreate = new Set<string>()
  const validated = rows.map((row): ValidatedRow => {
    const issues: RowIssue[] = []
    const key = examKey(row.patientId, row.examIndex)

    if ((seen.get(key) ?? []).length > 1) {
      issues.push({ code: 'DUPLICATE', message: `${row.patientId} appears twice with exam ${row.examIndex}` })
    }
    if (!context.allowedModalities.includes(row.modality)) {
      issues.push({ code: 'UNKNOWN_MODALITY', message: `unknown modality ${row.modality}` })
    }
    if (row.examIndex > context.maxExamsPerPatient) {
      issues.push({ code: 'INDEX_TOO_HIGH', message: `exam index ${row.examIndex} above the study limit of ${context.maxExamsPerPatient}` })
    }
    if (!ISO_DATE.test(row.examDate) || Number.isNaN(Date.parse(row.examDate))) {
      issues.push({ code: 'BAD_DATE', message: `date ${row.examDate} is not written YYYY-MM-DD` })
    } else if (context.studyStartedAt && new Date(row.examDate) < context.studyStartedAt) {
      issues.push({ code: 'DATE_BEFORE_STUDY', message: `date ${row.examDate} is before the study started` })
    }
    if (context.existingPatientExamKeys.has(key)) {
      issues.push({ code: 'PATIENT_EXISTS', message: `${row.patientId} already has exam ${row.examIndex}` })
    }
    if (!context.knownSiteCodes.includes(row.centreCode)) {
      issues.push({ code: 'NEW_SITE', message: `site ${row.centreCode} will be created` })
      sitesToCreate.add(row.centreCode)
    }

    const blocked = issues.some((issue) => BLOCKING.includes(issue.code))
    const verdict: RowVerdict = blocked ? 'BLOCKED' : issues.length > 0 ? 'WARNING' : 'READY'
    return { ...row, verdict, issues }
  })

  return {
    rows: validated,
    ready: validated.filter((row) => row.verdict === 'READY').length,
    warnings: validated.filter((row) => row.verdict === 'WARNING').length,
    blocked: validated.filter((row) => row.verdict === 'BLOCKED').length,
    sitesToCreate: [...sitesToCreate],
  }
}
