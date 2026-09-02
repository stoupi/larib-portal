import { prisma } from '@/lib/prisma'
import { accessWindowOpen } from '@/lib/permissions'
import type { CorelabStudyRole, Prisma } from '@/app/generated/prisma'

const MEMBER_SELECT = {
  id: true,
  role: true,
  canReview: true,
  certificationPhase: true,
  calibrationStatus: true,
  trainingDueAt: true,
  calibrationDueAt: true,
  joinedAt: true,
  user: { select: { id: true, firstName: true, lastName: true, email: true, profilePhoto: true } },
} satisfies Prisma.CorelabStudyMembershipSelect

export type StudyMember = Prisma.CorelabStudyMembershipGetPayload<{ select: typeof MEMBER_SELECT }>

export async function listMembers(studyId: string): Promise<StudyMember[]> {
  return prisma.corelabStudyMembership.findMany({
    where: { studyId, removedAt: null },
    select: MEMBER_SELECT,
    orderBy: { joinedAt: 'asc' },
  })
}

export type MemberCandidate = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
}

export async function listCandidates(studyId: string): Promise<MemberCandidate[]> {
  const users = await prisma.user.findMany({
    where: {
      OR: [{ applications: { has: 'CORELAB' } }, { adminApplications: { has: 'CORELAB' } }],
      corelabMemberships: { none: { studyId, removedAt: null } },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      accessPeriods: { select: { application: true, startsAt: true, endsAt: true } },
    },
    orderBy: [{ lastName: 'asc' }, { email: 'asc' }],
  })
  return users
    .filter((user) => accessWindowOpen(user.accessPeriods, 'CORELAB'))
    .map(({ id, firstName, lastName, email }) => ({ id, firstName, lastName, email }))
}

export type AddMemberInput = {
  studyId: string
  userId: string
  role: CorelabStudyRole
  canReview: boolean
  addedById: string
  trainingDueAt?: Date | null
  calibrationDueAt?: Date | null
}

export async function addMember(input: AddMemberInput): Promise<{ id: string }> {
  const active = await prisma.corelabStudyMembership.findFirst({
    where: { studyId: input.studyId, userId: input.userId, removedAt: null },
    select: { id: true },
  })
  if (active) throw new Error('ALREADY_MEMBER')
  if (input.role === 'PI') {
    const existingPi = await prisma.corelabStudyMembership.findFirst({
      where: { studyId: input.studyId, role: 'PI', removedAt: null },
      select: { id: true },
    })
    if (existingPi) throw new Error('PI_ALREADY_SET')
  }
  const certification =
    input.role === 'PI'
      ? { certificationPhase: 'PRODUCTION' as const, calibrationStatus: 'CERTIFIED' as const }
      : { certificationPhase: 'TRAINING' as const, calibrationStatus: 'NOT_STARTED' as const }

  const data = {
    role: input.role,
    canReview: input.canReview,
    addedById: input.addedById,
    trainingDueAt: input.trainingDueAt ?? null,
    calibrationDueAt: input.calibrationDueAt ?? null,
    ...certification,
  }

  return prisma.corelabStudyMembership.upsert({
    where: { studyId_userId: { studyId: input.studyId, userId: input.userId } },
    create: { studyId: input.studyId, userId: input.userId, ...data },
    update: { ...data, removedAt: null, joinedAt: new Date() },
    select: { id: true },
  })
}

export type UpdateMemberInput = {
  canReview?: boolean
  trainingDueAt?: Date | null
  calibrationDueAt?: Date | null
}

export async function updateMember(membershipId: string, input: UpdateMemberInput): Promise<void> {
  await prisma.corelabStudyMembership.update({
    where: { id: membershipId },
    data: input,
    select: { id: true },
  })
}

export async function removeMember(membershipId: string): Promise<void> {
  await prisma.corelabStudyMembership.update({
    where: { id: membershipId },
    data: { removedAt: new Date() },
    select: { id: true },
  })
}
