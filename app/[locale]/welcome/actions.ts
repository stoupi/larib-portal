"use server"
import { z } from 'zod'
import { unauthenticatedAction } from '@/actions/safe-action'
import { readInvitationByToken, consumeInvitation } from '@/lib/services/invitations'
import { activateInvitedUser } from '@/lib/services/user-activation'
import { auth } from '@/lib/auth'

const SetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
  confirm: z.string().min(6),
})
  .refine((data) => data.password === data.confirm, { message: 'PASSWORDS_NOT_MATCH', path: ['confirm'] })

export const setPasswordFromInviteAction = unauthenticatedAction
  .inputSchema(SetPasswordSchema)
  .action(async ({ parsedInput: { token, password } }) => {
    const invite = await readInvitationByToken(token)
    if (!invite) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN')
    }
    const { payload } = invite

    await activateInvitedUser(payload, password)

    await auth.api.signInEmail({
      body: { email: payload.email, password },
    })

    await consumeInvitation(invite.rowId)

    return { ok: true }
  })
