import { describe, expect, it, afterAll } from 'vitest'
import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env.test'), override: true })

const { PrismaClient } = await import('@/app/generated/prisma')
const prisma = new PrismaClient()

afterAll(async () => {
  await prisma.$disconnect()
})

describe('CorelabSignature immutability', () => {
  it('refuses an update and a delete on a written signature', async () => {
    const user = await prisma.user.findFirstOrThrow({ where: { email: 'corelab-admin@larib-portal.test' }, select: { id: true } })
    const signature = await prisma.corelabSignature.create({
      data: { userId: user.id, role: 'DATA_MANAGER', reason: 'immutability check', entityType: 'test', entityId: 'test' },
      select: { id: true },
    })
    await expect(
      prisma.corelabSignature.update({ where: { id: signature.id }, data: { reason: 'rewritten' } }),
    ).rejects.toThrow(/immutable record/)
    await expect(prisma.corelabSignature.delete({ where: { id: signature.id } })).rejects.toThrow(/immutable record/)
  })
})
