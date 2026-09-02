import ExcelJS from 'exceljs'
import type { CohortRow } from './validate'

export type ParseResult = { rows: CohortRow[]; errors: Array<{ line: number; message: string }> }

const HEADER_ALIASES: Record<string, keyof CohortRow> = {
  patientid: 'patientId',
  centre: 'centreCode',
  modality: 'modality',
  examdate: 'examDate',
  examindex: 'examIndex',
  timelabel: 'timeLabel',
}

function normaliseHeader(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '')
}

export function normaliseDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const text = String(value ?? '').trim()
  const french = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (french) return `${french[3]}-${french[2]}-${french[1]}`
  return text
}

function toRows(table: string[][]): ParseResult {
  const errors: Array<{ line: number; message: string }> = []
  if (table.length === 0) return { rows: [], errors: [{ line: 1, message: 'the file is empty' }] }

  const header = table[0].map((cell) => HEADER_ALIASES[normaliseHeader(cell)])
  const required: Array<keyof CohortRow> = ['patientId', 'centreCode', 'modality', 'examDate', 'examIndex']
  const missing = required.filter((column) => !header.includes(column))
  if (missing.length > 0) return { rows: [], errors: [{ line: 1, message: `missing columns: ${missing.join(', ')}` }] }

  const rows: CohortRow[] = []
  table.slice(1).forEach((cells, offset) => {
    const line = offset + 2
    if (cells.every((cell) => cell.trim().length === 0)) return
    const picked: Record<string, string> = {}
    header.forEach((column, index) => {
      if (column) picked[column] = (cells[index] ?? '').trim()
    })
    const examIndex = Number(picked.examIndex)
    if (!Number.isInteger(examIndex) || examIndex < 1) {
      errors.push({ line, message: 'examIndex must be a positive whole number' })
      return
    }
    rows.push({
      line,
      patientId: picked.patientId,
      centreCode: picked.centreCode,
      modality: picked.modality.toUpperCase(),
      examDate: normaliseDate(picked.examDate),
      examIndex,
      timeLabel: picked.timeLabel || (examIndex === 1 ? 'Baseline' : `FU${examIndex - 1}`),
    })
  })
  return { rows, errors }
}

function parseCsv(content: string): string[][] {
  const lines = content.split(/\r?\n/)
  const separator = (lines[0]?.split(';').length ?? 0) > (lines[0]?.split(',').length ?? 0) ? ';' : ','
  return lines.map((line) => line.split(separator))
}

export async function parseCohortFile(buffer: Buffer, fileName: string): Promise<ParseResult> {
  if (fileName.toLowerCase().endsWith('.csv')) return toRows(parseCsv(buffer.toString('utf8')))

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return { rows: [], errors: [{ line: 1, message: 'the workbook has no sheet' }] }

  const table: string[][] = []
  sheet.eachRow((row) => {
    const cells: string[] = []
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(cell.value instanceof Date ? normaliseDate(cell.value) : String(cell.value ?? ''))
    })
    table.push(cells)
  })
  return toRows(table)
}
