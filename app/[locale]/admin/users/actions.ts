"use server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { deleteUserById, updateUserWithAccessPeriods, createPlaceholderUserWithAccessPeriods } from "@/lib/services/users"
import { listPositions, ensurePosition, updatePosition, deletePositions } from '@/lib/services/positions'
import { createInvitation, deleteInvitationByEmail, consumeInvitation, getInvitationByEmail } from '@/lib/services/invitations'
import { sendWelcomeEmail } from '@/lib/services/email'
import { resolveAppBaseUrl } from '@/lib/app-url'
import { superAdminAction } from "@/actions/safe-action"
import { Prisma } from "@/app/generated/prisma"
import { prisma } from "@/lib/prisma"
import { accessPeriodsEndingOnDay, startOfDayUtc, endOfDayUtc } from '@/lib/services/access-periods'
import { ACTIVE_APPLICATIONS, toActiveApplications } from '@/lib/permissions'

const ApplicationEnum = z.enum(ACTIVE_APPLICATIONS)

const AccessPeriodSchema = z.object({
  application: ApplicationEnum,
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
})

function toAccessPeriodInputs(periods: z.infer<typeof AccessPeriodSchema>[] | undefined) {
  return (periods ?? []).map((period) => ({
    application: period.application,
    startsAt: period.startsAt ? startOfDayUtc(period.startsAt) : null,
    endsAt: period.endsAt ? endOfDayUtc(period.endsAt) : null,
  }))
}

const UpdateUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().trim().optional().nullable(),
  lastName: z.string().trim().optional().nullable(),
  phoneNumber: z.string().trim().optional().nullable(),
  role: z.enum(["ADMIN", "USER"]),
  country: z.string().trim().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  language: z.enum(["EN", "FR"]).optional(),
  position: z.string().trim().optional().nullable(),
  arrivalDate: z.string().optional().nullable(),
  departureDate: z.string().optional().nullable(),
  applications: z.array(ApplicationEnum).default([]),
  adminApplications: z.array(ApplicationEnum).optional(),
  accessPeriods: z.array(AccessPeriodSchema).optional(),
  locale: z.enum(["en", "fr"]).optional(),
  congesTotalDays: z.number().int().min(0).max(365).optional(),
  profilePhoto: z.string().url().or(z.literal('')).optional().nullable(),
})

export const updateUserAction = superAdminAction
  .inputSchema(UpdateUserSchema)
  .action(async ({ parsedInput }) => {
    const birthDate = parsedInput.birthDate ? new Date(parsedInput.birthDate) : null
    const arrivalDate = parsedInput.arrivalDate ? new Date(parsedInput.arrivalDate) : null
    const departureDate = parsedInput.departureDate ? new Date(parsedInput.departureDate) : null
    const language = parsedInput.language ?? (parsedInput.locale === 'fr' ? 'FR' : 'EN')
    const adminApplications = parsedInput.adminApplications ?? []

    const updated = await updateUserWithAccessPeriods(
      {
        id: parsedInput.id,
        email: parsedInput.email,
        firstName: parsedInput.firstName ?? null,
        lastName: parsedInput.lastName ?? null,
        phoneNumber: parsedInput.phoneNumber ?? null,
        role: parsedInput.role,
        country: parsedInput.country ?? null,
        birthDate,
        language,
        position: parsedInput.position ?? null,
        arrivalDate,
        departureDate,
        applications: parsedInput.applications,
        adminApplications,
        congesTotalDays: parsedInput.congesTotalDays,
        profilePhoto: parsedInput.profilePhoto || null,
      },
      toAccessPeriodInputs(parsedInput.accessPeriods),
    )
    revalidatePath('/admin/users')
    return updated
  })

const DeleteUserSchema = z.object({ id: z.string().min(1) })

export const deleteUserAction = superAdminAction
  .inputSchema(DeleteUserSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (ctx.user.id === parsedInput.id) {
      throw new Error("CANNOT_DELETE_SELF")
    }
    try {
      const userToDelete = await prisma.user.findUnique({
        where: { id: parsedInput.id },
        select: { email: true },
      })
      if (userToDelete) {
        await deleteInvitationByEmail(userToDelete.email)
      }
      await deleteUserById(parsedInput.id)
      return { ok: true }
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new Error("CANNOT_DELETE_USER_WITH_CLINICAL_CASES")
      }
      throw error
    }
  })

const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "USER"]),
  firstName: z.string().trim().optional().nullable(),
  lastName: z.string().trim().optional().nullable(),
  position: z.string().trim().optional().nullable(),
  applications: z.array(ApplicationEnum).default([]),
  adminApplications: z.array(ApplicationEnum).optional(),
  arrivalDate: z.string().min(1), // ISO date
  departureDate: z.string().min(1), // ISO date
  locale: z.enum(["en","fr"]),
  congesTotalDays: z.number().int().min(0).max(365).optional(),
  profilePhoto: z.string().url().or(z.literal('')).optional().nullable(),
})

export const createUserInviteAction = superAdminAction
  .inputSchema(CreateInviteSchema)
  .action(async ({ parsedInput }) => {
    const arrivalDate = new Date(parsedInput.arrivalDate)
    const departureDate = new Date(parsedInput.departureDate)
    const adminApplications = parsedInput.adminApplications ?? []

    // Create or ensure the position exists if provided
    let positionName: string | null = parsedInput.position ?? null
    if (positionName) {
      const pos = await ensurePosition(positionName)
      positionName = pos.name
    }

    // Create a placeholder user so the admin can see it immediately
    const grantedApplications = Array.from(new Set([...parsedInput.applications, ...adminApplications]))
    const placeholder = await createPlaceholderUserWithAccessPeriods(
      {
        email: parsedInput.email,
        role: parsedInput.role,
        firstName: parsedInput.firstName ?? null,
        lastName: parsedInput.lastName ?? null,
        language: parsedInput.locale === 'fr' ? 'FR' : 'EN',
        position: positionName,
        applications: parsedInput.applications,
        adminApplications,
        arrivalDate,
        departureDate,
        congesTotalDays: parsedInput.congesTotalDays,
        profilePhoto: parsedInput.profilePhoto || null,
      },
      accessPeriodsEndingOnDay(grantedApplications, parsedInput.departureDate),
    )

    // Create invitation token
    const { token, expiresAt } = await createInvitation({
      email: parsedInput.email,
      locale: parsedInput.locale,
      firstName: parsedInput.firstName ?? undefined,
      lastName: parsedInput.lastName ?? undefined,
      role: parsedInput.role,
      position: positionName,
      applications: parsedInput.applications,
      adminApplications,
      arrivalDate,
      departureDate,
      congesTotalDays: parsedInput.congesTotalDays,
    })

    const appUrl = resolveAppBaseUrl()
    const setupLink = `${appUrl}/${parsedInput.locale}/welcome/${token}`

    // Send welcome email via Resend
    await sendWelcomeEmail({
      to: parsedInput.email,
      locale: parsedInput.locale,
      firstName: parsedInput.firstName ?? undefined,
      lastName: parsedInput.lastName ?? undefined,
      position: positionName,
      setupLink,
      accessEndDate: departureDate,
    })

    return { ok: true, expiresAt }
  })

export const listPositionsAction = superAdminAction
  .inputSchema(z.object({}).optional())
  .action(async () => {
    const positions = await listPositions()
    return positions
  })

export const createPositionAction = superAdminAction
  .inputSchema(z.object({ name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const pos = await ensurePosition(parsedInput.name)
    revalidatePath('/admin/users')
    return pos
  })

export const updatePositionAction = superAdminAction
  .inputSchema(z.object({ id: z.string().min(1), name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const updated = await updatePosition(parsedInput.id, parsedInput.name)
    revalidatePath('/admin/users')
    return updated
  })

export const deletePositionsAction = superAdminAction
  .inputSchema(z.object({ ids: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput }) => {
    await deletePositions(parsedInput.ids)
    revalidatePath('/admin/users')
    return { deleted: parsedInput.ids.length }
  })

const ResendInvitationSchema = z.object({
  userId: z.string().min(1),
  locale: z.enum(["en", "fr"]),
})

export const resendInvitationAction = superAdminAction
  .inputSchema(ResendInvitationSchema)
  .action(async ({ parsedInput }) => {
    const user = await prisma.user.findUnique({
      where: { id: parsedInput.userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        position: true,
        applications: true,
        adminApplications: true,
        arrivalDate: true,
        departureDate: true,
        congesTotalDays: true,
        accounts: {
          where: { providerId: 'credential' },
          select: { password: true },
        },
      },
    })

    if (!user) {
      throw new Error("USER_NOT_FOUND")
    }

    const hasPassword = user.accounts.some((account) => account.password !== null)
    if (hasPassword) {
      throw new Error("USER_ALREADY_HAS_PASSWORD")
    }

    const existingInvitation = await getInvitationByEmail(user.email)
    if (existingInvitation) {
      await consumeInvitation(existingInvitation.rowId)
    }

    const { token, expiresAt } = await createInvitation({
      email: user.email,
      locale: parsedInput.locale,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      role: user.role as 'ADMIN' | 'USER',
      position: user.position,
      applications: toActiveApplications(user.applications),
      adminApplications: toActiveApplications(user.adminApplications),
      arrivalDate: user.arrivalDate,
      departureDate: user.departureDate,
      congesTotalDays: user.congesTotalDays,
    })

    const appUrl = resolveAppBaseUrl()
    const setupLink = `${appUrl}/${parsedInput.locale}/welcome/${token}`

    await sendWelcomeEmail({
      to: user.email,
      locale: parsedInput.locale,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      position: user.position,
      setupLink,
      accessEndDate: user.departureDate,
    })

    revalidatePath('/admin/users')
    return { ok: true, expiresAt }
  })
