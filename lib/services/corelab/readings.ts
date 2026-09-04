import { prisma } from '@/lib/prisma'
import { toJsonValue } from '@/lib/corelab/crf/json'
import { snapshotHash } from '@/lib/corelab/snapshot-hash'
import { nextSource } from '@/lib/corelab/crf/values'
import { readinessOf, type Readiness } from '@/lib/corelab/reading/readiness'
import { extractValues } from '@/lib/corelab/import/excel'
import { r2GetObject } from '@/lib/services/r2-s3'
import { assertStudyOpenForAssignment, getCurrentCrfVersion } from './studies'
import { listSlots } from './documents'
import { sendCorelabAssignmentEmail } from '@/lib/services/email'
import type { CrfDefinition } from '@/lib/corelab/crf/schema'
import type { ExamValues, FieldChange, ReadingValues } from '@/types/corelab'
import type { CorelabSequenceFlagCategory, Prisma } from '@/app/generated/prisma'
import type { ImportMapping } from '@/lib/corelab/import/mapping'

const EDITABLE = ['ASSIGNED', 'IN_PROGRESS', 'RETURNED']

const READING_SELECT = {
  id: true,
  userId: true,
  role: true,
  status: true,
  dueDate: true,
  crfVersionId: true,
  patient: {
    select: {
      id: true,
      code: true,
      studyId: true,
      readingMode: true,
      site: { select: { code: true } },
      study: { select: { id: true, code: true, name: true, reviewDeadlineDays: true } },
      exams: { select: { id: true, index: true, modality: true, examDate: true, timeLabel: true }, orderBy: { index: 'asc' } },
    },
  },
} satisfies Prisma.CorelabReadingAssignmentSelect

export type ReadingAssignment = Prisma.CorelabReadingAssignmentGetPayload<{ select: typeof READING_SELECT }>

export type ReadingContext = {
  assignment: ReadingAssignment
  definition: CrfDefinition
  crfVersionId: string
  values: ReadingValues
  flags: Array<{ examId: string; sequenceId: string; category: CorelabSequenceFlagCategory; note: string }>
  documents: Array<{ id: string; examId: string | null; slotKey: string; fileName: string; status: string; fileSize: number }>
  slots: Awaited<ReturnType<typeof listSlots>>
  editable: boolean
}

function toReadingValues(
  rows: Array<{ examId: string; sequenceId: string; fieldId: string; value: Prisma.JsonValue; source: string; flag: string | null; flagNote: string | null }>,
): ReadingValues {
  const values: ReadingValues = {}
  for (const row of rows) {
    const exam: ExamValues = values[row.examId] ?? {}
    const sequence = exam[row.sequenceId] ?? {}
    sequence[row.fieldId] = {
      value: row.value,
      source: row.source as 'MANUAL' | 'IMPORTED' | 'MODIFIED',
      flag: (row.flag ?? null) as never,
      flagNote: row.flagNote,
    }
    exam[row.sequenceId] = sequence
    values[row.examId] = exam
  }
  return values
}

export async function getReadingForUser(assignmentId: string, userId: string): Promise<ReadingContext | null> {
  const assignment = await prisma.corelabReadingAssignment.findUnique({
    where: { id: assignmentId },
    select: READING_SELECT,
  })
  if (!assignment || assignment.userId !== userId) return null

  const crfVersion = await getCurrentCrfVersion(assignment.patient.studyId)
  if (!crfVersion) return null

  const [rows, flags, documents, slots] = await Promise.all([
    prisma.corelabReadingValue.findMany({
      where: { assignmentId },
      select: { examId: true, sequenceId: true, fieldId: true, value: true, source: true, flag: true, flagNote: true },
    }),
    prisma.corelabSequenceFlag.findMany({
      where: { assignmentId },
      select: { examId: true, sequenceId: true, category: true, note: true },
    }),
    prisma.corelabReadingDocument.findMany({
      where: { assignmentId },
      select: { id: true, examId: true, slotKey: true, fileName: true, status: true, fileSize: true },
      orderBy: { uploadedAt: 'desc' },
    }),
    listSlots(assignment.patient.studyId),
  ])

  return {
    assignment,
    definition: crfVersion.definition,
    crfVersionId: assignment.crfVersionId ?? crfVersion.id,
    values: toReadingValues(rows),
    flags,
    documents,
    slots,
    editable: EDITABLE.includes(assignment.status),
  }
}

async function assertEditable(assignmentId: string, userId: string): Promise<void> {
  await assertStudyOpenForAssignment(assignmentId)
  const assignment = await prisma.corelabReadingAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    select: { userId: true, status: true },
  })
  if (assignment.userId !== userId) throw new Error('Forbidden')
  if (!EDITABLE.includes(assignment.status)) throw new Error('ALREADY_SUBMITTED')
}

export async function saveValues(assignmentId: string, userId: string, changes: FieldChange[]): Promise<void> {
  await assertEditable(assignmentId, userId)

  for (const change of changes) {
    const key = { assignmentId, examId: change.examId, sequenceId: change.sequenceId, fieldId: change.fieldId }
    const existing = await prisma.corelabReadingValue.findFirst({ where: key, select: { id: true, source: true } })

    if (!change.value) {
      if (existing) await prisma.corelabReadingValue.delete({ where: { id: existing.id } })
      continue
    }
    const data = {
      value: toJsonValue(change.value.value),
      source: nextSource(existing?.source as 'MANUAL' | 'IMPORTED' | 'MODIFIED' | undefined),
      flag: change.value.flag ?? null,
      flagNote: change.value.flagNote ?? null,
    }
    if (existing) await prisma.corelabReadingValue.update({ where: { id: existing.id }, data, select: { id: true } })
    else await prisma.corelabReadingValue.create({ data: { ...key, ...data }, select: { id: true } })
  }

  await prisma.corelabReadingAssignment.updateMany({
    where: { id: assignmentId, status: 'ASSIGNED' },
    data: { status: 'IN_PROGRESS' },
  })
}

export async function setSequenceFlag(
  assignmentId: string,
  userId: string,
  examId: string,
  sequenceId: string,
  flag: { category: CorelabSequenceFlagCategory; note: string } | null,
): Promise<void> {
  await assertEditable(assignmentId, userId)
  const existing = await prisma.corelabSequenceFlag.findFirst({
    where: { assignmentId, examId, sequenceId },
    select: { id: true },
  })
  if (!flag) {
    if (existing) await prisma.corelabSequenceFlag.delete({ where: { id: existing.id } })
    return
  }
  if (existing) {
    await prisma.corelabSequenceFlag.update({ where: { id: existing.id }, data: flag, select: { id: true } })
    return
  }
  await prisma.corelabSequenceFlag.create({ data: { assignmentId, examId, sequenceId, ...flag }, select: { id: true } })
}

export type ImportReport = { imported: number; keptBecauseModified: number; issues: number; unmatched: number }

export async function importFromWorkbook(
  assignmentId: string,
  userId: string,
  documentId: string,
  examId: string,
): Promise<ImportReport> {
  await assertEditable(assignmentId, userId)

  const context = await getReadingForUser(assignmentId, userId)
  if (!context) throw new Error('Forbidden')

  const document = await prisma.corelabReadingDocument.findUniqueOrThrow({
    where: { id: documentId },
    select: { fileKey: true, assignmentId: true },
  })
  if (document.assignmentId !== assignmentId) throw new Error('Forbidden')

  const mappings = await prisma.corelabImportMapping.findMany({
    where: { crfVersionId: context.crfVersionId },
    select: { sheetPattern: true, cellRef: true, columnHeader: true, sequenceId: true, fieldId: true },
  })
  const importMappings: ImportMapping[] = mappings
    .filter((row) => row.cellRef)
    .map((row) => ({
      sheetKey: row.sheetPattern,
      column: row.cellRef ?? '',
      columnHeader: row.columnHeader ?? '',
      sequenceId: row.sequenceId,
      fieldId: row.fieldId,
    }))

  const exam = context.assignment.patient.exams.find((candidate) => candidate.id === examId)
  const buffer = await r2GetObject(document.fileKey)
  const report = await extractValues(buffer, exam?.index ?? 1, importMappings, context.definition)

  let imported = 0
  let keptBecauseModified = 0

  for (const cell of report.cells) {
    if (cell.value === null) continue
    const key = { assignmentId, examId, sequenceId: cell.sequenceId, fieldId: cell.fieldId }
    const existing = await prisma.corelabReadingValue.findFirst({ where: key, select: { id: true, source: true } })
    if (existing && existing.source === 'MODIFIED') {
      keptBecauseModified += 1
      continue
    }
    const data = { value: toJsonValue(cell.value), source: 'IMPORTED' as const }
    if (existing) await prisma.corelabReadingValue.update({ where: { id: existing.id }, data, select: { id: true } })
    else await prisma.corelabReadingValue.create({ data: { ...key, ...data }, select: { id: true } })
    imported += 1
  }

  await prisma.corelabReadingAssignment.updateMany({
    where: { id: assignmentId, status: 'ASSIGNED' },
    data: { status: 'IN_PROGRESS' },
  })

  return {
    imported,
    keptBecauseModified,
    issues: report.cells.filter((cell) => cell.issue).length,
    unmatched: report.unmatchedFields.length,
  }
}

export async function readinessForSignature(assignmentId: string, userId: string): Promise<Readiness | null> {
  const context = await getReadingForUser(assignmentId, userId)
  if (!context) return null
  return readinessOf({
    definition: context.definition,
    exams: context.assignment.patient.exams.map((exam) => ({ id: exam.id, values: context.values[exam.id] ?? {} })),
    slots: context.slots,
    documents: context.documents,
    openFlags: context.flags.length,
  })
}

type SubmissionClient = Pick<Prisma.TransactionClient, 'corelabReadingSubmission' | 'corelabReadingAssignment'>

export async function submitReading(
  assignmentId: string,
  userId: string,
  signatureId: string,
  client: SubmissionClient = prisma,
): Promise<{ version: number; snapshotHash: string }> {
  await assertStudyOpenForAssignment(assignmentId)
  const context = await getReadingForUser(assignmentId, userId)
  if (!context) throw new Error('Forbidden')
  if (!EDITABLE.includes(context.assignment.status)) throw new Error('ALREADY_SUBMITTED')

  const snapshot = {
    values: context.values,
    flags: context.flags,
    documents: context.documents.map((document) => ({
      slotKey: document.slotKey,
      fileName: document.fileName,
      fileSize: document.fileSize,
      status: document.status,
    })),
  }
  const previous = await prisma.corelabReadingSubmission.findFirst({
    where: { assignmentId },
    orderBy: { version: 'desc' },
    select: { version: true },
  })
  const hash = snapshotHash(snapshot)

  await client.corelabReadingSubmission.create({
    data: {
      assignmentId,
      crfVersionId: context.crfVersionId,
      snapshot: toJsonValue(snapshot),
      snapshotHash: hash,
      version: (previous?.version ?? 0) + 1,
      signatureId,
    },
    select: { id: true },
  })
  await client.corelabReadingAssignment.update({
    where: { id: assignmentId },
    data: { status: 'SUBMITTED' },
    select: { id: true },
  })

  return { version: (previous?.version ?? 0) + 1, snapshotHash: hash }
}

export async function notifyReviewerIfReady(patientId: string, origin: string): Promise<{ notified: boolean }> {
  const patient = await prisma.corelabPatient.findUniqueOrThrow({
    where: { id: patientId },
    select: {
      studyId: true,
      study: { select: { id: true, code: true, name: true, reviewDeadlineDays: true } },
      exams: { select: { id: true } },
      assignments: {
        select: { id: true, role: true, status: true, user: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  })

  const readers = patient.assignments.filter((assignment) => assignment.role !== 'REVIEWER')
  if (readers.length === 0 || !readers.every((assignment) => assignment.status === 'SUBMITTED')) return { notified: false }

  await prisma.corelabPatient.update({
    where: { id: patientId },
    data: { status: 'UNDER_REVIEW' },
    select: { id: true },
  })

  const reviewer = patient.assignments.find((assignment) => assignment.role === 'REVIEWER')
  if (!reviewer) return { notified: false }

  const dueDate = new Date(Date.now() + patient.study.reviewDeadlineDays * 24 * 60 * 60 * 1000)
  await prisma.corelabReadingAssignment.update({
    where: { id: reviewer.id },
    data: { dueDate, status: 'ASSIGNED' },
    select: { id: true },
  })

  await sendCorelabAssignmentEmail({
    to: reviewer.user.email,
    readerName: [reviewer.user.firstName, reviewer.user.lastName].filter(Boolean).join(' ').trim() || reviewer.user.email,
    studyName: patient.study.name,
    studyCode: patient.study.code,
    patientCount: 1,
    examCount: patient.exams.length,
    dueDate: dueDate.toISOString().slice(0, 10),
    pace: null,
    readingsUrl: `${origin}/en/corelab/studies/${patient.study.id}/readings`,
  })

  return { notified: true }
}
