import type { CrfDefinition } from '@/lib/corelab/crf/schema'

export type ExportValues = Record<string, Record<string, unknown>>

export type ExportInput = {
  definition: CrfDefinition
  crfVersion: number
  patients: Array<{ code: string; exams: Array<{ id: string; index: number; date: string }> }>
  readings: Array<{ patientCode: string; examId: string; role: 'READER_1' | 'READER_2'; values: ExportValues }>
  decisions: Array<{
    patientCode: string
    examId: string
    sequenceId: string
    fieldId: string
    decision: string
    finalValue: unknown
    level: string | null
    signedAt: string | null
  }>
}

export const SEGMENT_COLUMNS = 17

function segmentLabel(fieldId: string, segment: number): string {
  return `${fieldId}_seg_${String(segment).padStart(2, '0')}`
}

function scalar(value: unknown): string | number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return null
}

function segmentOf(values: ExportValues, sequenceId: string, fieldId: string, segment: number): string | number | null {
  const raw = values[sequenceId]?.[fieldId]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return scalar((raw as Record<string, unknown>)[String(segment)])
}

export function longRows(input: ExportInput): Array<Record<string, string | number | null>> {
  const rows: Array<Record<string, string | number | null>> = []

  for (const patient of input.patients) {
    for (const exam of patient.exams) {
      const readingOf = (role: 'READER_1' | 'READER_2') =>
        input.readings.find(
          (reading) => reading.patientCode === patient.code && reading.examId === exam.id && reading.role === role,
        )?.values ?? {}
      const first = readingOf('READER_1')
      const second = readingOf('READER_2')

      for (const sequence of input.definition) {
        for (const section of sequence.sections) {
          for (const field of section.fields) {
            const decision = input.decisions.find(
              (entry) =>
                entry.patientCode === patient.code && entry.examId === exam.id &&
                entry.sequenceId === sequence.id && entry.fieldId === field.id,
            )
            const base = {
              patient_id: patient.code,
              exam_index: exam.index,
              exam_date: exam.date,
              sequence: sequence.id,
              crf_version: input.crfVersion,
              signed_at: decision?.signedAt ?? null,
            }

            if (field.type.startsWith('segment_')) {
              const count = field.segmentCount === 16 ? 16 : 17
              for (let segment = 1; segment <= count; segment += 1) {
                rows.push({
                  ...base,
                  variable: segmentLabel(field.id, segment),
                  reader_1: segmentOf(first, sequence.id, field.id, segment),
                  reader_2: segmentOf(second, sequence.id, field.id, segment),
                  final_value: segmentOf(first, sequence.id, field.id, segment),
                  discordance_level: null,
                  decision: null,
                })
              }
              continue
            }

            rows.push({
              ...base,
              variable: field.id,
              reader_1: scalar(first[sequence.id]?.[field.id]),
              reader_2: scalar(second[sequence.id]?.[field.id]),
              final_value: decision ? scalar(decision.finalValue) : scalar(first[sequence.id]?.[field.id]),
              discordance_level: decision?.level ?? null,
              decision: decision?.decision ?? null,
            })
          }
        }
      }
    }
  }
  return rows
}

export function wideRows(input: ExportInput): { headers: string[]; rows: Array<Record<string, unknown>> } {
  const headers = ['patient_id', 'exam_index', 'exam_date', 'crf_version']
  for (const sequence of input.definition) {
    for (const section of sequence.sections) {
      for (const field of section.fields) {
        if (field.type.startsWith('segment_')) {
          for (let segment = 1; segment <= SEGMENT_COLUMNS; segment += 1) {
            headers.push(`${sequence.id}.${segmentLabel(field.id, segment)}`)
          }
          continue
        }
        headers.push(`${sequence.id}.${field.id}`)
      }
    }
  }

  const rows = input.patients.flatMap((patient) =>
    patient.exams.map((exam) => {
      const first = input.readings.find(
        (reading) => reading.patientCode === patient.code && reading.examId === exam.id && reading.role === 'READER_1',
      )?.values ?? {}
      const row: Record<string, unknown> = {
        patient_id: patient.code,
        exam_index: exam.index,
        exam_date: exam.date,
        crf_version: input.crfVersion,
      }

      for (const sequence of input.definition) {
        for (const section of sequence.sections) {
          for (const field of section.fields) {
            if (field.type.startsWith('segment_')) {
              const count = field.segmentCount === 16 ? 16 : 17
              for (let segment = 1; segment <= SEGMENT_COLUMNS; segment += 1) {
                row[`${sequence.id}.${segmentLabel(field.id, segment)}`] =
                  segment > count ? null : segmentOf(first, sequence.id, field.id, segment)
              }
              continue
            }
            const decision = input.decisions.find(
              (entry) =>
                entry.patientCode === patient.code && entry.examId === exam.id &&
                entry.sequenceId === sequence.id && entry.fieldId === field.id,
            )
            row[`${sequence.id}.${field.id}`] = decision
              ? scalar(decision.finalValue)
              : scalar(first[sequence.id]?.[field.id])
          }
        }
      }
      return row
    }),
  )

  return { headers, rows }
}

export function reviewDecisionRows(input: ExportInput): Array<Record<string, unknown>> {
  return input.decisions.map((decision) => {
    const readingOf = (role: 'READER_1' | 'READER_2') =>
      input.readings.find(
        (reading) => reading.patientCode === decision.patientCode && reading.examId === decision.examId && reading.role === role,
      )?.values ?? {}
    const first = scalar(readingOf('READER_1')[decision.sequenceId]?.[decision.fieldId])
    const second = scalar(readingOf('READER_2')[decision.sequenceId]?.[decision.fieldId])
    return {
      patient_id: decision.patientCode,
      sequence: decision.sequenceId,
      variable: decision.fieldId,
      reader_1: first,
      reader_2: second,
      delta: typeof first === 'number' && typeof second === 'number' ? first - second : null,
      level: decision.level,
      decision: decision.decision,
      final_value: scalar(decision.finalValue),
      signed_at: decision.signedAt,
    }
  })
}

export function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const cell = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    const text = String(value)
    return /[;"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  const lines = [headers.join(';'), ...rows.map((row) => headers.map((header) => cell(row[header])).join(';'))]
  return `﻿${lines.join('\n')}`
}
