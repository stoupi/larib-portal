import { prisma } from '@/lib/prisma'
import type { Application, Prisma } from '@/app/generated/prisma'

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

export function accessPeriodsEndingOnDay(
  applications: Application[],
  dateString: string,
): AccessPeriodInput[] {
  const endsAt = endOfDayUtc(dateString)
  return applications.map((application) => ({ application, startsAt: null, endsAt }))
}

type AccessPeriodClient = Pick<Prisma.TransactionClient, 'applicationAccessPeriod'>

export async function replaceAccessPeriodsWithClient(
  client: AccessPeriodClient,
  userId: string,
  periods: AccessPeriodInput[],
): Promise<void> {
  const bounded = periods.filter((period) => period.startsAt !== null || period.endsAt !== null)
  await client.applicationAccessPeriod.deleteMany({ where: { userId } })
  for (const period of bounded) {
    await client.applicationAccessPeriod.create({
      data: {
        userId,
        application: period.application,
        startsAt: period.startsAt,
        endsAt: period.endsAt,
      },
    })
  }
}

export async function replaceAccessPeriods(userId: string, periods: AccessPeriodInput[]): Promise<void> {
  await prisma.$transaction((transaction) => replaceAccessPeriodsWithClient(transaction, userId, periods))
}
