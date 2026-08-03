import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { invitationPayloadToUserData, type InvitationPayload } from './invitations'

export function resolveInvitedUserName(payload: InvitationPayload): string {
  return [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim() || payload.email
}

async function upsertCredentialPassword(userId: string, password: string): Promise<void> {
  const authContext = await auth.$context
  const hashedPassword = await authContext.password.hash(password)
  const credentialAccount = await prisma.account.findFirst({
    where: { userId, providerId: 'credential' },
    select: { id: true },
  })

  if (credentialAccount) {
    await prisma.account.update({
      where: { id: credentialAccount.id },
      data: { password: hashedPassword },
    })
    return
  }

  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: hashedPassword,
    },
  })
}

export async function activateInvitedUser(payload: InvitationPayload, password: string): Promise<void> {
  const invitedName = resolveInvitedUserName(payload)
  const invitedUser = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true, name: true },
  })

  if (!invitedUser) {
    const result = await auth.api.signUpEmail({
      body: { email: payload.email, password, name: invitedName },
    })
    if ('error' in result && result.error) {
      throw new Error((result.error as { message?: string }).message || 'SIGNUP_FAILED')
    }
    await prisma.user.update({
      where: { email: payload.email },
      data: invitationPayloadToUserData(payload),
    })
    return
  }

  await upsertCredentialPassword(invitedUser.id, password)
  await prisma.user.update({
    where: { id: invitedUser.id },
    data: {
      emailVerified: true,
      name: invitedUser.name ?? invitedName,
    },
  })
}
