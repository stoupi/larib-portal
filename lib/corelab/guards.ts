import { appAdminAction, appMemberAction, authenticatedAction } from '@/actions/safe-action'
import { canAdminApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import {
  createSignature,
  verifyUserPassword,
  type SignatureClient,
  type SignatureRequest,
} from '@/lib/services/corelab/signatures'
import type { BetterAuthSession } from '@/types/session'

export const corelabMemberAction = appMemberAction('CORELAB')
export const corelabAdminAction = appAdminAction('CORELAB')

export type StudyCapability = 'READ' | 'ADJUDICATE' | 'AUTHOR_REFERENCE' | 'CERTIFY'
export type StudyAccess = {
  studyId: string
  isDataManager: boolean
  canRead: boolean
  canAdjudicate: boolean
  canAuthorReference: boolean
  canCertify: boolean
}

const DATA_MANAGER_ACCESS = (studyId: string): StudyAccess => ({
  studyId,
  isDataManager: true,
  canRead: true,
  canAdjudicate: true,
  canAuthorReference: true,
  canCertify: true,
})

export async function resolveStudyAccess(
  user: BetterAuthSession['user'],
  studyId: string,
  required: StudyCapability[],
): Promise<StudyAccess> {
  if (canAdminApp(user, 'CORELAB')) return DATA_MANAGER_ACCESS(studyId)

  const membership = await prisma.corelabStudyMembership.findFirst({
    where: { studyId, userId: user.id, removedAt: null },
    select: { canRead: true, canAdjudicate: true, canAuthorReference: true, canCertify: true },
  })
  if (!membership) throw new Error('Forbidden')

  const access: StudyAccess = { studyId, isDataManager: false, ...membership }
  const granted: Record<StudyCapability, boolean> = {
    READ: access.canRead,
    ADJUDICATE: access.canAdjudicate,
    AUTHOR_REFERENCE: access.canAuthorReference,
    CERTIFY: access.canCertify,
  }
  if (required.length > 0 && !required.some((capability) => granted[capability])) throw new Error('Forbidden')
  return access
}

export const corelabStudyAction = (required: StudyCapability[]) =>
  authenticatedAction.use(async ({ next, ctx, clientInput }) => {
    const input = clientInput as { studyId?: string } | undefined
    if (!input?.studyId) throw new Error('studyId required')
    const studyAccess = await resolveStudyAccess(ctx.user, input.studyId, required)
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
