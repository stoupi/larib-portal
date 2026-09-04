import { findField, type CrfDefinition, type FieldDefinition } from '@/lib/corelab/crf/schema'
import { isOutOfBounds } from '@/lib/corelab/crf/values'
import { FIRST_VALUE_ROW, HEADER_ROW, sheetForExam, type ImportMapping } from './mapping'
import { readWorksheets } from './xlsx-reader'

export type ImportIssue = 'OUT_OF_BOUNDS' | 'UNPARSEABLE' | 'UNKNOWN_OPTION'
export type ImportedCell = {
  sequenceId: string
  fieldId: string
  raw: unknown
  value: unknown
  issue?: ImportIssue
}

export type ExtractionReport = {
  cells: ImportedCell[]
  unmatchedFields: Array<{ sequenceId: string; fieldId: string }>
  missingSheets: string[]
}

const TRUE_WORDS = ['yes', 'oui', 'true', '1', 'y', 'o']
const FALSE_WORDS = ['no', 'non', 'false', '0', 'n']

export function convert(field: FieldDefinition, raw: unknown): { value: unknown; issue?: ImportIssue } {
  if (raw === null || raw === undefined || String(raw).trim() === '') return { value: null }
  const text = String(raw).trim()

  if (field.type === 'numeric') {
    const parsed = Number(text.replace(',', '.'))
    if (!Number.isFinite(parsed)) return { value: null, issue: 'UNPARSEABLE' }
    return { value: parsed, issue: isOutOfBounds(field, parsed) ? 'OUT_OF_BOUNDS' : undefined }
  }
  if (field.type === 'boolean') {
    const lowered = text.toLowerCase()
    if (TRUE_WORDS.includes(lowered)) return { value: true }
    if (FALSE_WORDS.includes(lowered)) return { value: false }
    return { value: null, issue: 'UNPARSEABLE' }
  }
  if (field.type === 'categorical') {
    const match = (field.options ?? []).find((option) => option.toLowerCase() === text.toLowerCase())
    if (!match) return { value: null, issue: 'UNKNOWN_OPTION' }
    return { value: match }
  }
  if (field.type === 'text') return { value: text }
  return { value: null, issue: 'UNPARSEABLE' }
}

export async function extractValues(
  buffer: Buffer,
  examIndex: number,
  mappings: ImportMapping[],
  definition: CrfDefinition,
): Promise<ExtractionReport> {
  const worksheets = readWorksheets(buffer, [HEADER_ROW, FIRST_VALUE_ROW])

  const cells: ImportedCell[] = []
  const matched = new Set<string>()
  const missingSheets: string[] = []

  const bySheet = new Map<string, ImportMapping[]>()
  for (const entry of mappings) {
    bySheet.set(entry.sheetKey, [...(bySheet.get(entry.sheetKey) ?? []), entry])
  }

  for (const [sheetKey, sheetMappings] of bySheet) {
    const pattern = sheetForExam(examIndex, sheetKey)
    const sheet = worksheets.find((candidate) => pattern.test(candidate.name))
    if (!sheet) {
      missingSheets.push(sheetKey)
      continue
    }
    const headerRow = sheet.rows.get(HEADER_ROW)
    const valueRow = sheet.rows.get(FIRST_VALUE_ROW)

    for (const entry of sheetMappings) {
      const field = findField(definition, entry.sequenceId, entry.fieldId)
      if (!field) continue
      const header = (headerRow?.get(entry.column) ?? '').trim()
      if (header !== '' && header.toLowerCase() !== entry.columnHeader.toLowerCase()) continue

      const raw = valueRow?.get(entry.column) ?? null
      const converted = convert(field, raw)
      if (converted.value === null && !converted.issue) continue
      matched.add(`${entry.sequenceId}.${entry.fieldId}`)
      cells.push({ sequenceId: entry.sequenceId, fieldId: entry.fieldId, raw, ...converted })
    }
  }

  const unmatchedFields = definition.flatMap((sequence) =>
    sequence.sections.flatMap((section) =>
      section.fields
        .filter((field) => !matched.has(`${sequence.id}.${field.id}`))
        .map((field) => ({ sequenceId: sequence.id, fieldId: field.id })),
    ),
  )

  return { cells, unmatchedFields, missingSheets }
}
