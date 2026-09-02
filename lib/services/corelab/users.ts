import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/app/generated/prisma'

const CORELAB_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  applications: true,
  adminApplications: true,
  accessPeriods: { select: { application: true, startsAt: true, endsAt: true } },
  corelabMemberships: {
    where: { removedAt: null },
    select: {
      canRead: true,
      canAdjudicate: true,
      canAuthorReference: true,
      canCertify: true,
      certificationPhase: true,
      study: { select: { id: true, code: true } },
    },
    orderBy: { joinedAt: 'asc' },
  },
  sessions: { select: { updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 1 },
} satisfies Prisma.UserSelect

export type CorelabUser = Prisma.UserGetPayload<{ select: typeof CORELAB_USER_SELECT }>

export async function listCorelabUsers(): Promise<CorelabUser[]> {
  return prisma.user.findMany({
    where: {
      OR: [{ applications: { has: 'CORELAB' } }, { adminApplications: { has: 'CORELAB' } }],
    },
    select: CORELAB_USER_SELECT,
    orderBy: [{ lastName: 'asc' }, { email: 'asc' }],
  })
}
