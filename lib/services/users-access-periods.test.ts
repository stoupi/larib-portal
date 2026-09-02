import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => {
  const transactionUserUpdate = vi.fn()
  const transactionUserCreate = vi.fn()
  const transactionUserFindUniqueOrThrow = vi.fn()
  const transactionPeriodDeleteMany = vi.fn()
  const transactionPeriodCreate = vi.fn()
  const transactionClient = {
    user: {
      update: transactionUserUpdate,
      create: transactionUserCreate,
      findUniqueOrThrow: transactionUserFindUniqueOrThrow,
    },
    applicationAccessPeriod: {
      deleteMany: transactionPeriodDeleteMany,
      create: transactionPeriodCreate,
    },
  }
  const transaction = vi.fn(async (operation: (client: typeof transactionClient) => Promise<unknown>) =>
    operation(transactionClient),
  )

  return {
    transaction,
    transactionUserUpdate,
    transactionUserCreate,
    transactionUserFindUniqueOrThrow,
    transactionPeriodDeleteMany,
    transactionPeriodCreate,
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: prismaMocks.transaction,
  },
}))

import { createPlaceholderUserWithAccessPeriods, updateUserWithAccessPeriods } from './users'

describe('updateUserWithAccessPeriods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMocks.transactionUserUpdate.mockResolvedValue({ id: 'user-1' })
    prismaMocks.transactionUserCreate.mockResolvedValue({ id: 'user-1' })
    prismaMocks.transactionPeriodDeleteMany.mockResolvedValue({ count: 0 })
    prismaMocks.transactionPeriodCreate.mockResolvedValue({ id: 'period-1' })
    prismaMocks.transactionUserFindUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'reader@example.test',
      applications: ['CORELAB'],
      adminApplications: [],
      accessPeriods: [],
    })
  })

  it('writes application grants and their periods inside one transaction', async () => {
    await updateUserWithAccessPeriods(
      {
        id: 'user-1',
        applications: ['CORELAB'],
        adminApplications: [],
      },
      [
        {
          application: 'CORELAB',
          startsAt: null,
          endsAt: new Date('2026-12-31T23:59:59.999Z'),
        },
      ],
    )

    expect(prismaMocks.transaction).toHaveBeenCalledOnce()
    expect(prismaMocks.transactionUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { applications: ['CORELAB'], adminApplications: [] },
    })
    expect(prismaMocks.transactionPeriodDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    expect(prismaMocks.transactionPeriodCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        application: 'CORELAB',
        startsAt: null,
        endsAt: new Date('2026-12-31T23:59:59.999Z'),
      },
    })
  })

  it('rejects the whole operation when a period write fails', async () => {
    prismaMocks.transactionPeriodCreate.mockRejectedValueOnce(new Error('period write failed'))

    await expect(
      updateUserWithAccessPeriods(
        { id: 'user-1', applications: ['CORELAB'] },
        [
          {
            application: 'CORELAB',
            startsAt: null,
            endsAt: new Date('2026-12-31T23:59:59.999Z'),
          },
        ],
      ),
    ).rejects.toThrow('period write failed')

    expect(prismaMocks.transaction).toHaveBeenCalledOnce()
    expect(prismaMocks.transactionUserFindUniqueOrThrow).not.toHaveBeenCalled()
  })

  it('creates an invited user and access periods inside one transaction', async () => {
    await createPlaceholderUserWithAccessPeriods(
      {
        email: 'invited@example.test',
        role: 'USER',
        applications: ['CORELAB'],
      },
      [
        {
          application: 'CORELAB',
          startsAt: null,
          endsAt: new Date('2026-12-31T23:59:59.999Z'),
        },
      ],
    )

    expect(prismaMocks.transaction).toHaveBeenCalledOnce()
    expect(prismaMocks.transactionUserCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'invited@example.test',
        role: 'USER',
        applications: ['CORELAB'],
      }),
    })
    expect(prismaMocks.transactionPeriodCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        application: 'CORELAB',
        endsAt: new Date('2026-12-31T23:59:59.999Z'),
      }),
    })
  })
})
