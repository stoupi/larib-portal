export type ParsedCase = { code: string; exams: Array<{ index: number; date: string; timeLabel: string }> }
export type ParsedCases = { cases: ParsedCase[]; errors: string[] }

const EXPECTED_HEADER = ['caseid', 'examindex', 'examdate', 'timelabel']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function parseCalibrationCasesCsv(content: string): ParsedCases {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return { cases: [], errors: ['empty file'] }

  const header = lines[0].split(',').map((cell) => cell.trim().toLowerCase())
  if (EXPECTED_HEADER.some((column, index) => header[index] !== column)) {
    return { cases: [], errors: [`unexpected header: ${EXPECTED_HEADER.join(', ')} expected`] }
  }

  const errors: string[] = []
  const byCode = new Map<string, ParsedCase>()

  lines.slice(1).forEach((line, offset) => {
    const lineNumber = offset + 2
    const cells = line.split(',').map((cell) => cell.trim())
    if (cells.length < 4) {
      errors.push(`line ${lineNumber}: four columns expected`)
      return
    }
    const [code, rawIndex, date, timeLabel] = cells
    const index = Number(rawIndex)
    if (!code) {
      errors.push(`line ${lineNumber}: caseId is empty`)
      return
    }
    if (!Number.isInteger(index) || index < 1) {
      errors.push(`line ${lineNumber}: examIndex must be a positive whole number`)
      return
    }
    if (!ISO_DATE.test(date)) {
      errors.push(`line ${lineNumber}: examDate must be written YYYY-MM-DD`)
      return
    }
    const parsedCase = byCode.get(code) ?? { code, exams: [] }
    parsedCase.exams.push({ index, date, timeLabel })
    byCode.set(code, parsedCase)
  })

  if (errors.length > 0) return { cases: [], errors }
  return {
    cases: [...byCode.values()].map((parsedCase) => ({
      ...parsedCase,
      exams: [...parsedCase.exams].sort((left, right) => left.index - right.index),
    })),
    errors: [],
  }
}
