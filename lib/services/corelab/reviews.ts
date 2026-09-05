import { prisma } from '@/lib/prisma'
import { toJsonValue } from '@/lib/corelab/crf/json'
import { compareReadings, comparedKey, finalValueFor, reviewComplete, type ComparedField, type DecisionType } from '@/lib/corelab/review/compare'
import { assertStudyOpenForPatient, getCurrentCrfVersion } from './studies'
import { sendCorelabAssignmentEmail } from '@/lib/services/email'
import type { CrfDefinition, DiscordanceThreshold } from '@/lib/corelab/crf/schema'
import type { ReadingValues } from '@/types/corelab'
import type { Prisma } from '@/app/generated/prisma'
import { pairStats } from '@/lib/corelab/review/pair-stats'

export type ReworkItem = { readerAssignmentId: string; sequenceId: string; fieldIds: string[] }

type SubmissionSnapshot = { values?: ReadingValues }

function snapshotValues(snapshot: Prisma.JsonValue): ReadingValues {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return {}
  return (snapshot as SubmissionSnapshot).values ?? {}
}

export type ReviewContext = {
  patient: {
    id: string
    code: string
    studyId: string
    status: string
    readingMode: string | null
    exams: Array<{ id: string; index: number; timeLabel: string }>
  }
  reviewerAssignmentId: string
  definition: CrfDefinition
  thresholds: DiscordanceThreshold[]
  compared: ComparedField[]
  decisions: Array<{ examId: string; sequenceId: string; fieldId: string; decision: DecisionType; customValue: Prisma.JsonValue }>
  readers: Array<{ assignmentId: string; userId: string; name: string; role: string }>
  pendingRework: boolean
}

export async function getReviewForUser(patientId: string, userId: string): Promise<ReviewContext | null> {
  const patient = await prisma.corelabPatient.findUnique({
    where: { id: patientId },
    select: {
      id: true, code: true, studyId: true, status: true, readingMode: true,
      exams: { select: { id: true, index: true, timeLabel: true }, orderBy: { index: 'asc' } },
      assignments: {
        select: {
          id: true, role: true, userId: true, status: true,
          user: { select: { firstName: true, lastName: true, email: true } },
          submissions: { select: { snapshot: true, version: true }, orderBy: { version: 'desc' }, take: 1 },
        },
      },
    },
  })
  if (!patient) return null

  const reviewer = patient.assignments.find((assignment) => assignment.role === 'REVIEWER')
  if (!reviewer || reviewer.userId !== userId) return null
  if (patient.assignments.some((assignment) => assignment.role !== 'REVIEWER' && assignment.userId === userId)) return null

  const crfVersion = await getCurrentCrfVersion(patient.studyId)
  if (!crfVersion) return null

  const readers = patient.assignments
    .filter((assignment) => assignment.role !== 'REVIEWER')
    .sort((left, right) => left.role.localeCompare(right.role))

  const [firstReader, secondReader] = readers
  const compared = compareReadings(
    crfVersion.definition,
    crfVersion.discordanceThresholds,
    snapshotValues(firstReader?.submissions[0]?.snapshot ?? null),
    secondReader ? snapshotValues(secondReader.submissions[0]?.snapshot ?? null) : null,
    patient.exams.map((exam) => exam.id),
  )

  const [decisions, pendingRework] = await Promise.all([
    prisma.corelabReviewDecision.findMany({
      where: { reviewerAssignmentId: reviewer.id },
      select: { examId: true, sequenceId: true, fieldId: true, decision: true, customValue: true },
    }),
    prisma.corelabReworkRequest.findFirst({ where: { patientId, status: 'PENDING' }, select: { id: true } }),
  ])

  return {
    patient: {
      id: patient.id, code: patient.code, studyId: patient.studyId,
      status: patient.status, readingMode: patient.readingMode,
      exams: patient.exams,
    },
    reviewerAssignmentId: reviewer.id,
    definition: crfVersion.definition,
    thresholds: crfVersion.discordanceThresholds,
    compared,
    decisions,
    readers: readers.map((assignment) => ({
      assignmentId: assignment.id,
      userId: assignment.userId,
      role: assignment.role,
      name: [assignment.user.firstName, assignment.user.lastName].filter(Boolean).join(' ').trim() || assignment.user.email,
    })),
    pendingRework: pendingRework !== null,
  }
}

export type DecisionInput = {
  examId: string
  sequenceId: string
  fieldId: string
  decision: DecisionType
  customValue?: unknown
}

export async function saveDecisions(patientId: string, userId: string, decisions: DecisionInput[]): Promise<void> {
  await assertStudyOpenForPatient(patientId)
  const context = await getReviewForUser(patientId, userId)
  if (!context) throw new Error('Forbidden')

  const comparedBy = new Map(context.compared.map((entry) => [comparedKey(entry), entry]))

  for (const input of decisions) {
    const compared = comparedBy.get(comparedKey(input))
    if (!compared) continue
    const data = {
      decision: input.decision,
      customValue: input.customValue === undefined ? undefined : toJsonValue(input.customValue),
      finalValue: toJsonValue(finalValueFor(input.decision, compared, input.customValue)),
      discordanceLevel: compared.level === 'NOT_COMPARED' ? null : compared.level,
    }
    const existing = await prisma.corelabReviewDecision.findFirst({
      where: {
        reviewerAssignmentId: context.reviewerAssignmentId,
        examId: input.examId, sequenceId: input.sequenceId, fieldId: input.fieldId,
      },
      select: { id: true },
    })
    if (existing) {
      await prisma.corelabReviewDecision.update({ where: { id: existing.id }, data, select: { id: true } })
      continue
    }
    await prisma.corelabReviewDecision.create({
      data: {
        patientId,
        reviewerAssignmentId: context.reviewerAssignmentId,
        examId: input.examId, sequenceId: input.sequenceId, fieldId: input.fieldId,
        ...data,
      },
      select: { id: true },
    })
  }
}

export async function requestRework(
  patientId: string,
  userId: string,
  items: ReworkItem[],
  comments: Record<string, string>,
  origin: string,
): Promise<{ id: string }> {
  await assertStudyOpenForPatient(patientId)
  const context = await getReviewForUser(patientId, userId)
  if (!context) throw new Error('Forbidden')
  if (items.length === 0) throw new Error('NOTHING_TO_REWORK')
  if (items.some((item) => !comments[`${item.readerAssignmentId}.${item.sequenceId}`]?.trim())) {
    throw new Error('COMMENT_REQUIRED')
  }

  const created = await prisma.corelabReworkRequest.create({
    data: { patientId, requestedById: userId, items: toJsonValue(items), comments: toJsonValue(comments) },
    select: { id: true },
  })

  const assignmentIds = [...new Set(items.map((item) => item.readerAssignmentId))]
  await prisma.corelabReadingAssignment.updateMany({
    where: { id: { in: assignmentIds } },
    data: { status: 'RETURNED' },
  })
  await prisma.corelabPatient.update({ where: { id: patientId }, data: { status: 'IN_PROGRESS' }, select: { id: true } })

  const study = await prisma.corelabStudy.findUniqueOrThrow({
    where: { id: context.patient.studyId },
    select: { id: true, code: true, name: true },
  })
  const readers = await prisma.corelabReadingAssignment.findMany({
    where: { id: { in: assignmentIds } },
    select: { user: { select: { firstName: true, lastName: true, email: true } } },
  })
  for (const reader of readers) {
    await sendCorelabAssignmentEmail({
      to: reader.user.email,
      readerName: [reader.user.firstName, reader.user.lastName].filter(Boolean).join(' ').trim() || reader.user.email,
      studyName: study.name,
      studyCode: study.code,
      patientCount: 1,
      examCount: context.patient.exams.length,
      dueDate: new Date().toISOString().slice(0, 10),
      pace: null,
      readingsUrl: `${origin}/en/corelab/studies/${study.id}/readings`,
    })
  }

  return created
}

export async function markReworkResubmitted(patientId: string): Promise<void> {
  const pending = await prisma.corelabReworkRequest.findFirst({
    where: { patientId, status: 'PENDING' },
    select: { id: true },
  })
  if (!pending) return
  await prisma.corelabReworkRequest.update({
    where: { id: pending.id },
    data: { status: 'RESUBMITTED', resubmittedAt: new Date() },
    select: { id: true },
  })
}

type ReviewClient = Pick<Prisma.TransactionClient, 'corelabReviewDecision' | 'corelabReadingAssignment' | 'corelabPatient'>

export async function signReview(
  patientId: string,
  userId: string,
  signatureId: string,
  client: ReviewClient = prisma,
): Promise<void> {
  const context = await getReviewForUser(patientId, userId)
  if (!context) throw new Error('Forbidden')

  const decided = new Map(context.decisions.map((decision) => [comparedKey(decision), { decision: decision.decision }]))
  const completion = reviewComplete(context.compared, decided)
  if (!completion.complete) throw new Error('DECISIONS_PENDING')

  // The OK fields never get an explicit decision: materialise them so the export
  // carries a final value for every compared field.
  for (const compared of context.compared) {
    if (compared.level !== 'OK') continue
    if (decided.has(comparedKey(compared))) continue
    await client.corelabReviewDecision.create({
      data: {
        patientId,
        reviewerAssignmentId: context.reviewerAssignmentId,
        examId: compared.examId, sequenceId: compared.sequenceId, fieldId: compared.fieldId,
        decision: 'R1',
        finalValue: toJsonValue(finalValueFor('R1', compared)),
        discordanceLevel: 'OK',
      },
      select: { id: true },
    })
  }

  await client.corelabReadingAssignment.updateMany({ where: { patientId }, data: { status: 'REVIEWED' } })
  await client.corelabPatient.update({ where: { id: patientId }, data: { status: 'COMPLETED' }, select: { id: true } })
}

export async function listReviewsForUser(studyId: string, userId: string) {
  return prisma.corelabReadingAssignment.findMany({
    where: { userId, role: 'REVIEWER', patient: { studyId }, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
    select: {
      id: true, dueDate: true, status: true,
      patient: { select: { id: true, code: true, status: true, exams: { select: { id: true } } } },
    },
    orderBy: { dueDate: 'asc' },
  })
}

export type DiscordanceStats = {
  variables: Array<{ fieldId: string; sequenceId: string; compared: number; minor: number; major: number; minorPercent: number; majorPercent: number }>
  pairs: Array<{ pair: string; names: string[]; exams: number; compared: number; discordantPercent: number; majorPercent: number }>
  totals: { compared: number; minor: number; major: number; awaitingReview: number }
}

export async function discordanceStats(studyId: string): Promise<DiscordanceStats> {
  const patientIds = await prisma.corelabPatient.findMany({ where: { studyId }, select: { id: true } })
  const [decisions, patients] = await Promise.all([
    prisma.corelabReviewDecision.findMany({
      where: { patientId: { in: patientIds.map((patient) => patient.id) } },
      select: { patientId: true, sequenceId: true, fieldId: true, discordanceLevel: true },
    }),
    prisma.corelabPatient.findMany({
      where: { studyId },
      select: {
        id: true,
        status: true,
        exams: { select: { id: true } },
        assignments: {
          where: { role: { in: ['READER_1', 'READER_2'] } },
          select: { userId: true, user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
    }),
  ])

  const byVariable = new Map<string, { sequenceId: string; fieldId: string; compared: number; minor: number; major: number }>()
  for (const decision of decisions) {
    if (!decision.discordanceLevel) continue
    const key = `${decision.sequenceId}.${decision.fieldId}`
    const current = byVariable.get(key) ?? { sequenceId: decision.sequenceId, fieldId: decision.fieldId, compared: 0, minor: 0, major: 0 }
    current.compared += 1
    if (decision.discordanceLevel === 'MINOR') current.minor += 1
    if (decision.discordanceLevel === 'MAJOR') current.major += 1
    byVariable.set(key, current)
  }

  const nameOf = new Map<string, string>()
  for (const patient of patients) {
    for (const assignment of patient.assignments) {
      nameOf.set(
        assignment.userId,
        [assignment.user.firstName, assignment.user.lastName].filter(Boolean).join(' ').trim() || assignment.user.email,
      )
    }
  }

  const totals = {
    compared: decisions.filter((decision) => decision.discordanceLevel).length,
    minor: decisions.filter((decision) => decision.discordanceLevel === 'MINOR').length,
    major: decisions.filter((decision) => decision.discordanceLevel === 'MAJOR').length,
    awaitingReview: patients.filter((patient) => patient.status === 'UNDER_REVIEW').length,
  }
  return {
    variables: [...byVariable.values()]
      .map((variable) => ({
        ...variable,
        minorPercent: variable.compared === 0 ? 0 : (variable.minor / variable.compared) * 100,
        majorPercent: variable.compared === 0 ? 0 : (variable.major / variable.compared) * 100,
      }))
      .sort((left, right) => right.major - left.major || right.minor - left.minor),
    pairs: pairStats(
      patients.map((patient) => ({
        patientId: patient.id,
        readerIds: patient.assignments.map((assignment) => assignment.userId),
        examCount: patient.exams.length,
      })),
      decisions.map((decision) => ({ patientId: decision.patientId, level: decision.discordanceLevel })),
    ).map((pair) => ({
      ...pair,
      names: pair.readerIds.map((userId) => nameOf.get(userId) ?? userId),
    })),
    totals,
  }
}

export type OpenRework = {
  id: string
  items: ReworkItem[]
  comments: Record<string, string>
}

export async function openReworkFor(patientId: string): Promise<OpenRework | null> {
  const rework = await prisma.corelabReworkRequest.findFirst({
    where: { patientId, status: 'PENDING' },
    select: { id: true, items: true, comments: true },
    orderBy: { requestedAt: 'desc' },
  })
  if (!rework) return null
  return {
    id: rework.id,
    items: Array.isArray(rework.items) ? (rework.items as unknown as ReworkItem[]) : [],
    comments: (rework.comments ?? {}) as Record<string, string>,
  }
}
