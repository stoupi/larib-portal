import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { config } from 'dotenv'
import { addDays, startOfDay } from 'date-fns'
import type { PrismaClient } from '@/app/generated/prisma'

const ADMIN_WITH_ALLOWANCE_EMAIL = 'conges-team-admin-allowance@larib-portal.test'
const ADMIN_WITHOUT_ALLOWANCE_EMAIL = 'conges-team-admin-no-allowance@larib-portal.test'

let prisma: PrismaClient
let congesServices: typeof import('./index')
let calendarFeed: typeof import('./calendar-feed')

async function deleteTestUsers(): Promise<void> {
  await prisma.user.deleteMany({
    where: { email: { in: [ADMIN_WITH_ALLOWANCE_EMAIL, ADMIN_WITHOUT_ALLOWANCE_EMAIL] } },
  })
}

describe('conges team membership for portal admins', () => {
  beforeAll(async () => {
    config({ path: '.env.test', override: true })
    const generatedPrisma = await import('@/app/generated/prisma')
    prisma = new generatedPrisma.PrismaClient()
    congesServices = await import('./index')
    calendarFeed = await import('./calendar-feed')
    await deleteTestUsers()
  })

  afterAll(async () => {
    await deleteTestUsers()
    await prisma.$disconnect()
  })

  it('keeps an admin leave pending, lists it for approval, then shows it once approved', async () => {
    const adminWithAllowance = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: ADMIN_WITH_ALLOWANCE_EMAIL,
        firstName: 'Allowance',
        lastName: 'Admin',
        role: 'ADMIN',
        applications: ['CONGES'],
        congesTotalDays: 45,
      },
    })
    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: ADMIN_WITHOUT_ALLOWANCE_EMAIL,
        role: 'ADMIN',
        applications: ['CONGES'],
        congesTotalDays: 0,
      },
    })

    const leaveStart = startOfDay(addDays(new Date(), 1))
    const leaveEnd = addDays(leaveStart, 2)
    await congesServices.createLeaveRequest(
      { userId: adminWithAllowance.id, startDate: leaveStart, endDate: leaveEnd, reason: null },
      {},
    )

    const created = await prisma.leaveRequest.findFirstOrThrow({ where: { userId: adminWithAllowance.id } })
    expect(created.status).toBe('PENDING')

    const dashboard = await congesServices.getAdminLeaveDashboard({})
    expect(dashboard.pendingRequests.map((request) => request.id)).toContain(created.id)
    const overviewEmails = dashboard.rows.map((row) => row.email)
    expect(overviewEmails).toContain(ADMIN_WITH_ALLOWANCE_EMAIL)
    expect(overviewEmails).not.toContain(ADMIN_WITHOUT_ALLOWANCE_EMAIL)

    await congesServices.updateLeaveStatus({
      requestId: created.id,
      approverId: adminWithAllowance.id,
      status: 'APPROVED',
    })

    const calendar = await congesServices.getLeaveCalendarData(leaveStart)
    const absentUserIds = calendar.calendarDays.flatMap((day) => day.absentees.map((absentee) => absentee.userId))
    expect(absentUserIds).toContain(adminWithAllowance.id)

    const feedLeaves = await calendarFeed.getCalendarFeedLeaves()
    expect(feedLeaves.map((leave) => leave.id)).toContain(created.id)
  })
})
