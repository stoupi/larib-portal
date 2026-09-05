import { prisma } from '@/lib/prisma'
import { toJsonValue } from '@/lib/corelab/crf/json'
import { nextCalibrationStatus } from '@/lib/corelab/calibration/status'
import { getCurrentCrfVersion } from './studies'
import { ASSIGNMENT_SELECT, readValues, refreshCalibrationStatus } from './calibration'
import type { CorelabCalibrationDecision, Prisma } from '@/app/generated/prisma'

export async function readerCalibrationOverview(studyId: string, userId: string) {
  const [assignments, lastReview, crfVersion] = await Promise.all([
    prisma.corelabCalibrationAssignment.findMany({
      where: { userId, case: { studyId } },
      select: ASSIGNMENT_SELECT,
      orderBy: { case: { code: 'asc' } },
    }),
    prisma.corelabCalibrationReview.findFirst({
      where: { studyId, userId },
      select: { decision: true, comments: true, createdAt: true, reviewerId: true },
      orderBy: { createdAt: 'desc' },
    }),
    getCurrentCrfVersion(studyId),
  ])
  return { assignments, lastReview, crfVersion }
}

export async function piCalibrationOverview(studyId: string) {
  const memberships = await prisma.corelabStudyMembership.findMany({
    where: { studyId, removedAt: null, canRead: true },
    select: {
      userId: true,
      certificationPhase: true,
      canAdjudicate: true,
      calibrationStatus: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { joinedAt: 'asc' },
  })
  const readers = await Promise.all(
    memberships.map(async (membership) => {
      const assignments = await prisma.corelabCalibrationAssignment.findMany({
        where: { userId: membership.userId, case: { studyId } },
        select: { status: true },
      })
      const submitted = assignments.filter((assignment) => assignment.status !== 'NOT_STARTED' && assignment.status !== 'IN_PROGRESS').length
      const lastReview = await prisma.corelabCalibrationReview.findFirst({
        where: { studyId, userId: membership.userId },
        select: { decision: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      })
      return {
        ...membership,
        assigned: assignments.length,
        submitted,
        readyForReview: assignments.length > 0 && submitted === assignments.length,
        lastReview,
      }
    }),
  )
  return readers
}

export async function piReviewData(studyId: string, userId: string) {
  const [assignments, crfVersion, lastReview] = await Promise.all([
    prisma.corelabCalibrationAssignment.findMany({
      where: { userId, case: { studyId } },
      select: ASSIGNMENT_SELECT,
      orderBy: { case: { code: 'asc' } },
    }),
    getCurrentCrfVersion(studyId),
    prisma.corelabCalibrationReview.findFirst({
      where: { studyId, userId },
      select: { comments: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  return { assignments, crfVersion, lastReview }
}

type ReviewClient = Pick<Prisma.TransactionClient, 'corelabCalibrationReview' | 'corelabStudyMembership' | 'corelabCalibrationAssignment'>

export async function recordCalibrationDecision(
  input: {
    studyId: string
    userId: string
    reviewerId: string
    decision: CorelabCalibrationDecision
    comments: Record<string, string>
    signatureId: string
  },
  client: ReviewClient = prisma,
): Promise<void> {
  await client.corelabCalibrationReview.create({
    data: {
      studyId: input.studyId,
      userId: input.userId,
      reviewerId: input.reviewerId,
      decision: input.decision,
      comments: toJsonValue(input.comments),
      signatureId: input.signatureId,
    },
    select: { id: true },
  })

  const membership = await prisma.corelabStudyMembership.findFirst({
    where: { studyId: input.studyId, userId: input.userId, removedAt: null },
    select: { id: true },
  })
  if (!membership) throw new Error('NOT_A_MEMBER')

  if (input.decision === 'CERTIFY') {
    await client.corelabStudyMembership.update({
      where: { id: membership.id },
      data: { calibrationStatus: 'CERTIFIED', certificationPhase: 'PRODUCTION' },
      select: { id: true },
    })
    return
  }
  if (input.decision === 'FAIL') {
    await client.corelabStudyMembership.update({
      where: { id: membership.id },
      data: { calibrationStatus: 'FAILED' },
      select: { id: true },
    })
    return
  }
  await client.corelabStudyMembership.update({
    where: { id: membership.id },
    data: { calibrationStatus: 'ADDITIONAL_CASES' },
    select: { id: true },
  })
  await client.corelabCalibrationAssignment.updateMany({
    where: { userId: input.userId, case: { studyId: input.studyId }, status: 'SUBMITTED' },
    data: { status: 'REVIEWED' },
  })
}
