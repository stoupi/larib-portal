import { prisma } from '@/lib/prisma'
import type { Application, Prisma } from '@/app/generated/prisma'
import { applicationsToAdd } from '@/lib/user-management/grants'
import { endOfDayUtc } from './access-periods'
import type { ActiveApplication } from '@/lib/permissions'

const directoryUserSelect = {
  id: true,
  email: true,
  name: true,
  firstName: true,
  lastName: true,
  position: true,
  applications: true,
  adminApplications: true,
} satisfies Prisma.UserSelect

export type DirectoryUser = Prisma.UserGetPayload<{ select: typeof directoryUserSelect }>

export async function listDirectoryUsers(): Promise<DirectoryUser[]> {
  return prisma.user.findMany({
    orderBy: [{ lastName: 'asc' }, { email: 'asc' }],
    select: directoryUserSelect,
  })
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  return user?.id ?? null
}

export async function addMemberApplications(
  userId: string,
  requested: Application[],
): Promise<{ user: DirectoryUser; added: ActiveApplication[] }> {
  return prisma.$transaction(async (transaction) => {
    const holder = await transaction.user.findUniqueOrThrow({
      where: { id: userId },
      select: { applications: true, adminApplications: true, departureDate: true },
    })
    const added = applicationsToAdd(holder, requested)
    if (added.length > 0) {
      await transaction.user.update({
        where: { id: userId },
        data: { applications: { set: [...holder.applications, ...added] } },
      })
    }
    if (added.length > 0 && holder.departureDate) {
      const endsAt = endOfDayUtc(holder.departureDate.toISOString().slice(0, 10))
      for (const application of added) {
        await transaction.applicationAccessPeriod.upsert({
          where: { userId_application: { userId, application } },
          create: { userId, application, startsAt: null, endsAt },
          update: { startsAt: null, endsAt },
        })
      }
    }
    const user = await transaction.user.findUniqueOrThrow({ where: { id: userId }, select: directoryUserSelect })
    return { user, added }
  })
}

export async function listSuperAdminRecipients(): Promise<Array<{ email: string; language: 'EN' | 'FR' }>> {
  return prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true, language: true },
  })
}
