import { prisma } from '@/lib/prisma'
import type { Application } from '@/app/generated/prisma'

export type AccessPeriodInput = {
  application: Application
  startsAt: Date | null
  endsAt: Date | null
}

export function endOfDayUtc(dateString: string): Date {
  return new Date(`${dateString}T23:59:59.999Z`)
}

export function startOfDayUtc(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`)
}

export async function replaceAccessPeriods(userId: string, periods: AccessPeriodInput[]): Promise<void> {
  const bounded = periods.filter((period) => period.startsAt !== null || period.endsAt !== null)
  await prisma.$transaction([
    prisma.applicationAccessPeriod.deleteMany({ where: { userId } }),
    ...bounded.map((period) =>
      prisma.applicationAccessPeriod.create({
        data: { userId, application: period.application, startsAt: period.startsAt, endsAt: period.endsAt },
      }),
    ),
  ])
}
