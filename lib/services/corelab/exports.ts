import { prisma } from '@/lib/prisma'
import { r2GetSignedDownloadUrl, r2PutObject } from '@/lib/services/r2-s3'
import { longRows, reviewDecisionRows, toCsv, wideRows, type ExportInput, type ExportValues } from '@/lib/corelab/export/rows'
import { getCurrentCrfVersion } from './studies'
import type { CorelabExportKind, Prisma } from '@/app/generated/prisma'

type SubmissionSnapshot = { values?: Record<string, Record<string, Record<string, { value: unknown }>>> }

function flatten(snapshot: Prisma.JsonValue, examId: string): ExportValues {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return {}
  const values = (snapshot as SubmissionSnapshot).values?.[examId] ?? {}
  return Object.fromEntries(
    Object.entries(values).map(([sequenceId, fields]) => [
      sequenceId,
      Object.fromEntries(Object.entries(fields).map(([fieldId, field]) => [fieldId, field?.value ?? null])),
    ]),
  )
}

export async function buildExportInput(studyId: string): Promise<ExportInput | null> {
  const crfVersion = await getCurrentCrfVersion(studyId)
  if (!crfVersion) return null

  const patients = await prisma.corelabPatient.findMany({
    where: { studyId },
    select: {
      id: true, code: true,
      exams: { select: { id: true, index: true, examDate: true }, orderBy: { index: 'asc' } },
      assignments: {
        where: { role: { in: ['READER_1', 'READER_2'] } },
        select: {
          role: true,
          submissions: { select: { snapshot: true }, orderBy: { version: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { code: 'asc' },
  })

  const decisions = await prisma.corelabReviewDecision.findMany({
    where: { patientId: { in: patients.map((patient) => patient.id) } },
    select: {
      patientId: true, examId: true, sequenceId: true, fieldId: true,
      decision: true, finalValue: true, discordanceLevel: true, updatedAt: true,
    },
  })
  const patientCode = new Map(patients.map((patient) => [patient.id, patient.code]))

  return {
    definition: crfVersion.definition,
    crfVersion: crfVersion.number,
    patients: patients.map((patient) => ({
      code: patient.code,
      exams: patient.exams.map((exam) => ({
        id: exam.id,
        index: exam.index,
        date: exam.examDate.toISOString().slice(0, 10),
      })),
    })),
    readings: patients.flatMap((patient) =>
      patient.exams.flatMap((exam) =>
        patient.assignments
          .filter((assignment) => assignment.submissions.length > 0)
          .map((assignment) => ({
            patientCode: patient.code,
            examId: exam.id,
            role: assignment.role as 'READER_1' | 'READER_2',
            values: flatten(assignment.submissions[0].snapshot, exam.id),
          })),
      ),
    ),
    decisions: decisions.map((decision) => ({
      patientCode: patientCode.get(decision.patientId) ?? decision.patientId,
      examId: decision.examId,
      sequenceId: decision.sequenceId,
      fieldId: decision.fieldId,
      decision: decision.decision,
      finalValue: decision.finalValue,
      level: decision.discordanceLevel,
      signedAt: decision.updatedAt.toISOString().slice(0, 10),
    })),
  }
}

export type ExportPreview = { headers: string[]; rows: Array<Record<string, unknown>>; rowCount: number }

function shape(kind: CorelabExportKind, input: ExportInput): ExportPreview {
  if (kind === 'READINGS_WIDE') {
    const wide = wideRows(input)
    return { ...wide, rowCount: wide.rows.length }
  }
  if (kind === 'REVIEW_DECISIONS') {
    const rows = reviewDecisionRows(input)
    return {
      headers: ['patient_id', 'sequence', 'variable', 'reader_1', 'reader_2', 'delta', 'level', 'decision', 'final_value', 'signed_at'],
      rows,
      rowCount: rows.length,
    }
  }
  const rows = longRows(input)
  return {
    headers: ['patient_id', 'exam_index', 'exam_date', 'sequence', 'variable', 'reader_1', 'reader_2', 'final_value', 'discordance_level', 'decision', 'signed_at', 'crf_version'],
    rows,
    rowCount: rows.length,
  }
}

export async function previewExport(studyId: string, kind: CorelabExportKind, limit = 6): Promise<ExportPreview | null> {
  const input = await buildExportInput(studyId)
  if (!input) return null
  const shaped = shape(kind, input)
  return { ...shaped, rows: shaped.rows.slice(0, limit) }
}

export async function buildExport(
  studyId: string,
  kind: CorelabExportKind,
  requestedById: string,
): Promise<{ id: string; url: string; rowCount: number } | null> {
  const input = await buildExportInput(studyId)
  if (!input) return null

  const study = await prisma.corelabStudy.findUniqueOrThrow({ where: { id: studyId }, select: { code: true } })
  const shaped = shape(kind, input)
  const csv = toCsv(shaped.headers, shaped.rows)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `${study.code}-${kind.toLowerCase()}-${stamp}.csv`
  const fileKey = `corelab/${studyId}/exports/${fileName}`

  await r2PutObject(fileKey, Buffer.from(csv, 'utf8'), 'text/csv; charset=utf-8')
  const created = await prisma.corelabExport.create({
    data: { studyId, kind, fileKey, fileName, rowCount: shaped.rowCount, requestedById },
    select: { id: true },
  })

  return { id: created.id, url: await r2GetSignedDownloadUrl(fileKey, 600), rowCount: shaped.rowCount }
}

export async function listExports(studyId: string) {
  return prisma.corelabExport.findMany({
    where: { studyId },
    select: { id: true, kind: true, fileName: true, rowCount: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}

export async function exportDownloadUrl(exportId: string): Promise<string> {
  const record = await prisma.corelabExport.findUniqueOrThrow({ where: { id: exportId }, select: { fileKey: true } })
  return r2GetSignedDownloadUrl(record.fileKey, 600)
}
