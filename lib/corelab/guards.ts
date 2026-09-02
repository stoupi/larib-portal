import { appAdminAction, appMemberAction, authenticatedAction } from '@/actions/safe-action'
import { canAdminApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { CorelabStudyRole } from '@/app/generated/prisma'
import {
  createSignature,
  verifyUserPassword,
  type SignatureClient,
  type SignatureRequest,
} from '@/lib/services/corelab/signatures'
import type { BetterAuthSession } from '@/types/session'

export const corelabMemberAction = appMemberAction('CORELAB')
export const corelabAdminAction = appAdminAction('CORELAB')

export type StudyRole = CorelabStudyRole | 'DATA_MANAGER'
export type StudyAccess = { studyId: string; role: StudyRole; canReview: boolean }

export async function resolveStudyAccess(
  user: BetterAuthSession['user'],
  studyId: string,
  allowed: StudyRole[],
): Promise<StudyAccess> {
  if (allowed.includes('DATA_MANAGER') && canAdminApp(user, 'CORELAB')) {
    return { studyId, role: 'DATA_MANAGER', canReview: false }
  }
  const membership = await prisma.corelabStudyMembership.findFirst({
    where: { studyId, userId: user.id, removedAt: null },
    select: { role: true, canReview: true },
  })
  if (!membership || !allowed.includes(membership.role)) throw new Error('Forbidden')
  return { studyId, role: membership.role, canReview: membership.canReview }
}

export const corelabStudyAction = (allowed: StudyRole[]) =>
  authenticatedAction.use(async ({ next, ctx, clientInput }) => {
    const input = clientInput as { studyId?: string } | undefined
    if (!input?.studyId) throw new Error('studyId required')
    const studyAccess = await resolveStudyAccess(ctx.user, input.studyId, allowed)
    return next({ ctx: { ...ctx, studyAccess } })
  })

export type SignedInput = { password: string; reason: string }

export async function signOrThrow(
  session: BetterAuthSession,
  input: SignedInput,
  signature: Omit<SignatureRequest, 'userId' | 'reason' | 'ipAddress'>,
  client?: SignatureClient,
): Promise<{ id: string }> {
  const valid = await verifyUserPassword(session.user.id, input.password)
  if (!valid) throw new Error('INVALID_PASSWORD')
  return createSignature(
    {
      ...signature,
      userId: session.user.id,
      reason: input.reason,
      ipAddress: session.session.ipAddress ?? null,
    },
    client,
  )
}
