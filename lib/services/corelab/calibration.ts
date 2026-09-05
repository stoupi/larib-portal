import { prisma } from '@/lib/prisma'
import { toJsonValue } from '@/lib/corelab/crf/json'
import { nextCalibrationStatus } from '@/lib/corelab/calibration/status'
import { assertStudyOpen, getCurrentCrfVersion } from './studies'
import type { CorelabCalibrationDecision, Prisma } from '@/app/generated/prisma'
import type { ExamValues, ReadingValues } from '@/types/corelab'

export type CaseExam = { index: number; date: string; timeLabel: string }

const CASE_SELECT = {
  id: true,
  code: true,
  exams: true,
  goldStandard: true,
  goldStandardUserId: true,
  goldStandardSignatureId: true,
  assignments: {
    select: {
      id: true,
      status: true,
      submittedAt: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
} satisfies Prisma.CorelabCalibrationCaseSelect

export type CalibrationCase = Prisma.CorelabCalibrationCaseGetPayload<{ select: typeof CASE_SELECT }>

export async function listCases(studyId: string): Promise<CalibrationCase[]> {
  return prisma.corelabCalibrationCase.findMany({
    where: { studyId },
    select: CASE_SELECT,
    orderBy: { code: 'asc' },
  })
}

export function readCaseExams(exams: Prisma.JsonValue): CaseExam[] {
  if (!Array.isArray(exams)) return []
  return exams.filter((exam): exam is CaseExam =>
    typeof exam === 'object' && exam !== null && 'index' in exam && 'date' in exam,
  )
}

export function readValues(values: Prisma.JsonValue): ReadingValues {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return {}
  return values as ReadingValues
}

async function nextCaseCode(studyId: string): Promise<string> {
  const study = await prisma.corelabStudy.findUniqueOrThrow({ where: { id: studyId }, select: { code: true } })
  const count = await prisma.corelabCalibrationCase.count({ where: { studyId } })
  return `CAL-${study.code}-${String(count + 1).padStart(3, '0')}`
}

export async function createCase(
  studyId: string,
  input: { code?: string | null; exams: CaseExam[] },
): Promise<{ id: string; code: string }> {
  await assertStudyOpen(studyId)
  const code = input.code?.trim() || (await nextCaseCode(studyId))
  return prisma.corelabCalibrationCase.create({
    data: { studyId, code, exams: toJsonValue(input.exams) },
    select: { id: true, code: true },
  })
}

export async function importCases(
  studyId: string,
  cases: Array<{ code: string; exams: CaseExam[] }>,
): Promise<{ created: number }> {
  const existing = await prisma.corelabCalibrationCase.findMany({
    where: { studyId, code: { in: cases.map((parsedCase) => parsedCase.code) } },
    select: { code: true },
  })
  const known = new Set(existing.map((parsedCase) => parsedCase.code))
  const toCreate = cases.filter((parsedCase) => !known.has(parsedCase.code))
  for (const parsedCase of toCreate) {
    await prisma.corelabCalibrationCase.create({
      data: { studyId, code: parsedCase.code, exams: toJsonValue(parsedCase.exams) },
      select: { id: true },
    })
  }
  return { created: toCreate.length }
}

export async function setReferenceAuthor(caseId: string, userId: string | null): Promise<void> {
  await prisma.corelabCalibrationCase.update({
    where: { id: caseId },
    data: { goldStandardUserId: userId },
    select: { id: true },
  })
}

export async function listReferenceAuthors(studyId: string) {
  return prisma.corelabStudyMembership.findMany({
    where: { studyId, removedAt: null, canAuthorReference: true },
    select: { userId: true, user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { joinedAt: 'asc' },
  })
}

export async function saveGoldStandardValues(caseId: string, values: ReadingValues): Promise<void> {
  const calibrationCase = await prisma.corelabCalibrationCase.findUniqueOrThrow({
    where: { id: caseId },
    select: { goldStandardSignatureId: true, studyId: true },
  })
  await assertStudyOpen(calibrationCase.studyId)
  if (calibrationCase.goldStandardSignatureId) throw new Error('GOLD_STANDARD_SIGNED')
  await prisma.corelabCalibrationCase.update({
    where: { id: caseId },
    data: { goldStandard: toJsonValue(values) },
    select: { id: true },
  })
}

type CaseClient = Pick<Prisma.TransactionClient, 'corelabCalibrationCase'>

export async function signGoldStandard(caseId: string, signatureId: string, client: CaseClient = prisma): Promise<void> {
  await client.corelabCalibrationCase.update({
    where: { id: caseId },
    data: { goldStandardSignatureId: signatureId },
    select: { id: true },
  })
}

export async function assignCases(
  studyId: string,
  caseIds: string[],
  userIds: string[],
): Promise<{ created: number }> {
  await assertStudyOpen(studyId)
  const eligible = await prisma.corelabStudyMembership.findMany({
    where: { studyId, userId: { in: userIds }, removedAt: null, certificationPhase: 'CALIBRATION' },
    select: { userId: true },
  })
  const allowed = new Set(eligible.map((membership) => membership.userId))
  const refused = userIds.filter((userId) => !allowed.has(userId))
  if (refused.length > 0) throw new Error('READER_NOT_IN_CALIBRATION')

  const unsigned = await prisma.corelabCalibrationCase.count({
    where: { id: { in: caseIds }, goldStandardSignatureId: null },
  })
  if (unsigned > 0) throw new Error('REFERENCE_NOT_SIGNED')

  let created = 0
  for (const caseId of caseIds) {
    for (const userId of userIds) {
      const existing = await prisma.corelabCalibrationAssignment.findUnique({
        where: { caseId_userId: { caseId, userId } },
        select: { id: true },
      })
      if (existing) continue
      await prisma.corelabCalibrationAssignment.create({ data: { caseId, userId }, select: { id: true } })
      created += 1
    }
  }
  await Promise.all(userIds.map((userId) => refreshCalibrationStatus(studyId, userId)))
  return { created }
}

export async function refreshCalibrationStatus(studyId: string, userId: string): Promise<void> {
  const membership = await prisma.corelabStudyMembership.findFirst({
    where: { studyId, userId, removedAt: null },
    select: { id: true, calibrationStatus: true },
  })
  if (!membership) return
  if (membership.calibrationStatus === 'CERTIFIED' || membership.calibrationStatus === 'FAILED') return
  const assignments = await prisma.corelabCalibrationAssignment.findMany({
    where: { userId, case: { studyId } },
    select: { status: true },
  })
  await prisma.corelabStudyMembership.update({
    where: { id: membership.id },
    data: { calibrationStatus: nextCalibrationStatus(assignments) },
    select: { id: true },
  })
}

export const ASSIGNMENT_SELECT = {
  id: true,
  status: true,
  values: true,
  submittedAt: true,
  userId: true,
  case: { select: { id: true, code: true, exams: true, studyId: true, goldStandard: true } },
} satisfies Prisma.CorelabCalibrationAssignmentSelect

export type CalibrationAssignment = Prisma.CorelabCalibrationAssignmentGetPayload<{ select: typeof ASSIGNMENT_SELECT }>

export async function getAssignmentForReader(
  assignmentId: string,
  userId: string,
): Promise<CalibrationAssignment | null> {
  const assignment = await prisma.corelabCalibrationAssignment.findUnique({
    where: { id: assignmentId },
    select: ASSIGNMENT_SELECT,
  })
  if (!assignment || assignment.userId !== userId) return null
  return assignment
}

export async function saveCalibrationValues(
  assignmentId: string,
  userId: string,
  values: ExamValues,
  examId: string,
): Promise<void> {
  const assignment = await prisma.corelabCalibrationAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    select: { userId: true, status: true, values: true, case: { select: { studyId: true } } },
  })
  if (assignment.userId !== userId) throw new Error('Forbidden')
  if (assignment.status === 'SUBMITTED' || assignment.status === 'REVIEWED') throw new Error('ALREADY_SUBMITTED')

  const current = readValues(assignment.values)
  await prisma.corelabCalibrationAssignment.update({
    where: { id: assignmentId },
    data: { values: toJsonValue({ ...current, [examId]: values }), status: 'IN_PROGRESS' },
    select: { id: true },
  })
  await refreshCalibrationStatus(assignment.case.studyId, userId)
}

type AssignmentClient = Pick<Prisma.TransactionClient, 'corelabCalibrationAssignment'>

export async function submitCalibrationCase(
  assignmentId: string,
  userId: string,
  signatureId: string,
  client: AssignmentClient = prisma,
): Promise<void> {
  const assignment = await prisma.corelabCalibrationAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    select: { userId: true, status: true },
  })
  if (assignment.userId !== userId) throw new Error('Forbidden')
  if (assignment.status === 'SUBMITTED' || assignment.status === 'REVIEWED') throw new Error('ALREADY_SUBMITTED')
  await client.corelabCalibrationAssignment.update({
    where: { id: assignmentId },
    data: { status: 'SUBMITTED', submittedAt: new Date(), signatureId },
    select: { id: true },
  })
}
