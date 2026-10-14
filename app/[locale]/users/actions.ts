"use server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { userManagerAction } from "@/actions/safe-action"
import { ACTIVE_APPLICATIONS, isSuperAdmin, ungrantableApplications } from "@/lib/permissions"
import { createPlaceholderUserWithAccessPeriods } from "@/lib/services/users"
import { listPositions } from "@/lib/services/positions"
import { createInvitation } from "@/lib/services/invitations"
import { accessPeriodsEndingOnDay } from "@/lib/services/access-periods"
import {
  addMemberApplications,
  findUserIdByEmail,
  listSuperAdminRecipients,
} from "@/lib/services/user-managers"
import { sendUserManagerNotificationEmail, sendWelcomeEmail } from "@/lib/services/email"
import type { UserManagerNotificationKind } from "@/lib/email/user-manager-notification-template"
import type { ActiveApplication } from "@/lib/permissions"
import type { SessionUser } from "@/types/session"
import { resolveAppBaseUrl } from "@/lib/app-url"
import { directoryUserName } from "@/lib/user-management/display-name"

const ApplicationEnum = z.enum(ACTIVE_APPLICATIONS)

function assertGrantable(manager: SessionUser, requested: ActiveApplication[]) {
  if (ungrantableApplications(manager, requested).length > 0) {
    throw new Error("APPLICATION_NOT_GRANTABLE")
  }
}

async function notifySuperAdmins(params: {
  manager: SessionUser
  kind: UserManagerNotificationKind
  target: { email: string; name: string | null; firstName: string | null; lastName: string | null }
  applications: ActiveApplication[]
}) {
  if (isSuperAdmin(params.manager)) return
  const recipients = await listSuperAdminRecipients()
  await sendUserManagerNotificationEmail({
    recipients,
    kind: params.kind,
    managerName: directoryUserName(params.manager),
    targetName: directoryUserName(params.target),
    targetEmail: params.target.email,
    applications: params.applications,
  })
}

const InviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().optional().nullable(),
  lastName: z.string().trim().optional().nullable(),
  position: z.string().trim().optional().nullable(),
  applications: z.array(ApplicationEnum).default([]),
  arrivalDate: z.string().min(1),
  departureDate: z.string().min(1),
  locale: z.enum(["en", "fr"]),
})

export const inviteMemberAction = userManagerAction
  .inputSchema(InviteMemberSchema)
  .action(async ({ parsedInput, ctx }) => {
    assertGrantable(ctx.user, parsedInput.applications)

    if (await findUserIdByEmail(parsedInput.email)) {
      throw new Error("USER_ALREADY_EXISTS")
    }

    const positions = await listPositions()
    const position = parsedInput.position
      ? positions.find((candidate) => candidate.name === parsedInput.position)?.name ?? null
      : null
    const arrivalDate = new Date(parsedInput.arrivalDate)
    const departureDate = new Date(parsedInput.departureDate)

    const placeholder = await createPlaceholderUserWithAccessPeriods(
      {
        email: parsedInput.email,
        role: "USER",
        firstName: parsedInput.firstName ?? null,
        lastName: parsedInput.lastName ?? null,
        language: parsedInput.locale === "fr" ? "FR" : "EN",
        position,
        applications: parsedInput.applications,
        adminApplications: [],
        arrivalDate,
        departureDate,
      },
      accessPeriodsEndingOnDay(parsedInput.applications, parsedInput.departureDate),
    )

    const { token, expiresAt } = await createInvitation({
      email: parsedInput.email,
      locale: parsedInput.locale,
      firstName: parsedInput.firstName ?? undefined,
      lastName: parsedInput.lastName ?? undefined,
      role: "USER",
      position,
      applications: parsedInput.applications,
      adminApplications: [],
      arrivalDate,
      departureDate,
    })

    await sendWelcomeEmail({
      to: parsedInput.email,
      locale: parsedInput.locale,
      firstName: parsedInput.firstName ?? undefined,
      lastName: parsedInput.lastName ?? undefined,
      position,
      setupLink: `${resolveAppBaseUrl()}/${parsedInput.locale}/welcome/${token}`,
      accessEndDate: departureDate,
    })

    await notifySuperAdmins({
      manager: ctx.user,
      kind: "INVITED",
      target: placeholder,
      applications: parsedInput.applications,
    })

    revalidatePath("/users")
    revalidatePath("/admin/users")
    return { ok: true, expiresAt }
  })

const GrantApplicationsSchema = z.object({
  userId: z.string().min(1),
  applications: z.array(ApplicationEnum).min(1),
})

export const grantMemberApplicationsAction = userManagerAction
  .inputSchema(GrantApplicationsSchema)
  .action(async ({ parsedInput, ctx }) => {
    assertGrantable(ctx.user, parsedInput.applications)

    const { user, added } = await addMemberApplications(parsedInput.userId, parsedInput.applications)

    if (added.length > 0) {
      await notifySuperAdmins({ manager: ctx.user, kind: "APPLICATIONS_ADDED", target: user, applications: added })
    }

    revalidatePath("/users")
    revalidatePath("/admin/users")
    return { added }
  })
