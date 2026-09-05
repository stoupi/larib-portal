import { prisma } from '@/lib/prisma'
import { r2GetSignedDownloadUrl, r2PutObject } from '@/lib/services/r2-s3'
import archiver from 'archiver'
import {
  CALIBRATION_HEADERS, calibrationRows, longRows, reviewDecisionRows, toCsv, wideRows,
  type CalibrationExportRow, type ExportInput, type ExportValues,
} from '@/lib/corelab/export/rows'
import { compareToGoldStandard } from '@/lib/corelab/crf/tolerance'
import { findField } from '@/lib/corelab/crf/schema'
import { exportAuditCsv } from './audit'
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

export async function calibrationExportRows(studyId: string): Promise<CalibrationExportRow[]> {
  const crfVersion = await getCurrentCrfVersion(studyId)
  if (!crfVersion) return []

  const [assignments, reviews] = await Promise.all([
    prisma.corelabCalibrationAssignment.findMany({
      where: { case: { studyId }, status: { in: ['SUBMITTED', 'REVIEWED'] } },
      select: {
        values: true, userId: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        case: { select: { code: true, goldStandard: true } },
      },
    }),
    prisma.corelabCalibrationReview.findMany({
      where: { studyId },
      select: { userId: true, decision: true, comments: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const reviewOf = new Map(reviews.map((review) => [review.userId, review]))
  const rows: CalibrationExportRow[] = []

  for (const assignment of assignments) {
    const reader = [assignment.user.firstName, assignment.user.lastName].filter(Boolean).join(' ').trim() || assignment.user.email
    const review = reviewOf.get(assignment.userId)
    const comments = (review?.comments ?? {}) as Record<string, string>
    const readerValues = readValuesOf(assignment.values)
    const goldValues = readValuesOf(assignment.case.goldStandard)

    for (const examId of new Set([...Object.keys(readerValues), ...Object.keys(goldValues)])) {
      for (const sequence of crfVersion.definition) {
        for (const section of sequence.sections) {
          for (const field of section.fields) {
            const readerValue = readerValues[examId]?.[sequence.id]?.[field.id]?.value ?? null
            const goldValue = goldValues[examId]?.[sequence.id]?.[field.id]?.value ?? null
            if (readerValue === null && goldValue === null) continue

            const definitionField = findField(crfVersion.definition, sequence.id, field.id)
            const verdict = definitionField ? compareToGoldStandard(definitionField, readerValue, goldValue) : null
            rows.push({
              reader,
              caseCode: assignment.case.code,
              sequenceId: sequence.id,
              fieldId: field.id,
              readerValue,
              goldValue,
              delta: verdict?.delta ?? null,
              withinTolerance: verdict && verdict.rule !== 'not_compared' ? verdict.withinTolerance : null,
              comment: comments[`${examId}.${sequence.id}.${field.id}`] ?? null,
              decision: review?.decision ?? null,
            })
          }
        }
      }
    }
  }
  return rows
}

type StoredValues = Record<string, Record<string, Record<string, { value: unknown }>>>

function readValuesOf(raw: Prisma.JsonValue): StoredValues {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as StoredValues
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
  if (kind === 'CALIBRATION') {
    const rows = calibrationRows(await calibrationExportRows(studyId))
    return { headers: CALIBRATION_HEADERS, rows: rows.slice(0, limit), rowCount: rows.length }
  }
  const input = await buildExportInput(studyId)
  if (!input) return null
  const shaped = shape(kind, input)
  return { ...shaped, rows: shaped.rows.slice(0, limit) }
}

async function buildArchive(studyId: string, input: ExportInput): Promise<{ buffer: Buffer; rowCount: number }> {
  const long = shape('READINGS_LONG', input)
  const wide = shape('READINGS_WIDE', input)
  const decisions = shape('REVIEW_DECISIONS', input)
  const calibration = calibrationRows(await calibrationExportRows(studyId))
  const auditCsv = await exportAuditCsv({ studyId, pageSize: 5000 })

  const archive = archiver('zip', { zlib: { level: 9 } })
  const chunks: Buffer[] = []
  archive.on('data', (chunk: Buffer) => chunks.push(chunk))

  // Archiver is itself a readable stream: consuming it directly avoids a
  // PassThrough that never emits `end` when nothing else drains it.
  const finished = new Promise<void>((resolve, reject) => {
    archive.on('end', () => resolve())
    archive.on('error', reject)
    archive.on('warning', reject)
  })

  archive.append(toCsv(long.headers, long.rows), { name: 'readings-long.csv' })
  archive.append(toCsv(wide.headers, wide.rows), { name: 'readings-wide.csv' })
  archive.append(toCsv(decisions.headers, decisions.rows), { name: 'review-decisions.csv' })
  archive.append(toCsv(CALIBRATION_HEADERS, calibration), { name: 'calibration.csv' })
  archive.append(JSON.stringify(input.definition, null, 2), { name: `crf-v${input.crfVersion}.json` })
  archive.append(auditCsv, { name: 'audit.csv' })

  void archive.finalize()
  await finished
  return { buffer: Buffer.concat(chunks), rowCount: long.rowCount }
}

export async function buildExport(
  studyId: string,
  kind: CorelabExportKind,
  requestedById: string,
): Promise<{ id: string; url: string; rowCount: number } | null> {
  const input = await buildExportInput(studyId)
  if (!input) return null

  const study = await prisma.corelabStudy.findUniqueOrThrow({ where: { id: studyId }, select: { code: true } })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')

  let body: Buffer
  let rowCount: number
  let extension: string
  let contentType: string

  if (kind === 'FULL_ARCHIVE') {
    const archive = await buildArchive(studyId, input)
    body = archive.buffer
    rowCount = archive.rowCount
    extension = 'zip'
    contentType = 'application/zip'
  } else if (kind === 'CALIBRATION') {
    const rows = calibrationRows(await calibrationExportRows(studyId))
    body = Buffer.from(toCsv(CALIBRATION_HEADERS, rows), 'utf8')
    rowCount = rows.length
    extension = 'csv'
    contentType = 'text/csv; charset=utf-8'
  } else {
    const shaped = shape(kind, input)
    body = Buffer.from(toCsv(shaped.headers, shaped.rows), 'utf8')
    rowCount = shaped.rowCount
    extension = 'csv'
    contentType = 'text/csv; charset=utf-8'
  }

  const fileName = `${study.code}-${kind.toLowerCase()}-${stamp}.${extension}`
  const fileKey = `corelab/${studyId}/exports/${fileName}`
  await r2PutObject(fileKey, body, contentType)
  const created = await prisma.corelabExport.create({
    data: { studyId, kind, fileKey, fileName, rowCount, requestedById },
    select: { id: true },
  })

  return { id: created.id, url: await r2GetSignedDownloadUrl(fileKey, 600), rowCount }
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
