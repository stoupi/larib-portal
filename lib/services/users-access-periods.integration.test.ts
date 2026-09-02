import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { config } from 'dotenv'
import type { PrismaClient } from '@/app/generated/prisma'

const EXISTING_EMAIL = 'access-period-rollback-existing@larib-portal.test'
const INVITED_EMAIL = 'access-period-rollback-invited@larib-portal.test'

let prisma: PrismaClient
let userServices: typeof import('./users')

async function deleteTestUsers(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: [EXISTING_EMAIL, INVITED_EMAIL] } } })
}

describe('application access period transactions', () => {
  beforeAll(async () => {
    config({ path: '.env.test', override: true })
    const generatedPrisma = await import('@/app/generated/prisma')
    prisma = new generatedPrisma.PrismaClient()
    userServices = await import('./users')
    await deleteTestUsers()
  })

  afterAll(async () => {
    await deleteTestUsers()
    await prisma.$disconnect()
  })

  it('rolls back application grants when period replacement fails', async () => {
    const existingUser = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: EXISTING_EMAIL,
        role: 'USER',
        applications: ['CONGES'],
        adminApplications: [],
      },
    })
    const duplicatePeriods = [
      {
        application: 'CORELAB' as const,
        startsAt: null,
        endsAt: new Date('2026-12-31T23:59:59.999Z'),
      },
      {
        application: 'CORELAB' as const,
        startsAt: null,
        endsAt: new Date('2027-12-31T23:59:59.999Z'),
      },
    ]

    await expect(
      userServices.updateUserWithAccessPeriods(
        { id: existingUser.id, applications: ['CORELAB'], adminApplications: [] },
        duplicatePeriods,
      ),
    ).rejects.toThrow()

    const persisted = await prisma.user.findUniqueOrThrow({
      where: { id: existingUser.id },
      select: { applications: true, accessPeriods: true },
    })
    expect(persisted.applications).toEqual(['CONGES'])
    expect(persisted.accessPeriods).toEqual([])
  })

  it('rolls back the invited placeholder when period creation fails', async () => {
    const duplicatePeriods = [
      {
        application: 'CORELAB' as const,
        startsAt: null,
        endsAt: new Date('2026-12-31T23:59:59.999Z'),
      },
      {
        application: 'CORELAB' as const,
        startsAt: null,
        endsAt: new Date('2027-12-31T23:59:59.999Z'),
      },
    ]

    await expect(
      userServices.createPlaceholderUserWithAccessPeriods(
        { email: INVITED_EMAIL, role: 'USER', applications: ['CORELAB'] },
        duplicatePeriods,
      ),
    ).rejects.toThrow()

    expect(await prisma.user.findUnique({ where: { email: INVITED_EMAIL } })).toBeNull()
  })
})
