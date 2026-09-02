import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { CorelabSignatureRole, Prisma } from '@/app/generated/prisma'

export type SignatureClient = Prisma.TransactionClient | typeof prisma

export type SignatureRequest = {
  userId: string
  reason: string
  role: CorelabSignatureRole
  entityType: string
  entityId: string
  studyId?: string | null
  crfVersionId?: string | null
  snapshotHash?: string | null
  ipAddress?: string | null
}

export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: 'credential' },
    select: { password: true },
  })
  if (!account?.password) return false
  const authContext = await auth.$context
  return authContext.password.verify({ hash: account.password, password })
}

export async function createSignature(
  request: SignatureRequest,
  client: SignatureClient = prisma,
): Promise<{ id: string }> {
  return client.corelabSignature.create({
    data: {
      userId: request.userId,
      role: request.role,
      reason: request.reason,
      entityType: request.entityType,
      entityId: request.entityId,
      studyId: request.studyId ?? null,
      crfVersionId: request.crfVersionId ?? null,
      snapshotHash: request.snapshotHash ?? null,
      ipAddress: request.ipAddress ?? null,
    },
    select: { id: true },
  })
}
