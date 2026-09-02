import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import type { InvitationStatus } from './invitations'
import { accountsAreActivated } from '@/lib/account-status'
import type { ActiveApplication } from '@/lib/permissions'
import { replaceAccessPeriodsWithClient, type AccessPeriodInput } from './access-periods'

const userWithAdminFieldsSelect = {
  id: true,
  email: true,
  name: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  role: true,
  country: true,
  birthDate: true,
  language: true,
  position: true,
  arrivalDate: true,
  departureDate: true,
  congesTotalDays: true,
  profilePhoto: true,
  applications: true,
  adminApplications: true,
  accessPeriods: { select: { application: true, startsAt: true, endsAt: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect

export type UserWithAdminFields = Prisma.UserGetPayload<{ select: typeof userWithAdminFieldsSelect }>

export async function listUsers(): Promise<UserWithAdminFields[]> {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: userWithAdminFieldsSelect,
  })
}

export async function deleteUserById(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } })
}

export async function getUserRole(userId: string): Promise<'ADMIN' | 'USER'> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return (user?.role as 'ADMIN' | 'USER') ?? 'USER'
}

export type UpdateUserInput = {
  id: string
  email?: string
  firstName?: string | null
  lastName?: string | null
  phoneNumber?: string | null
  role?: 'ADMIN' | 'USER'
  country?: string | null
  birthDate?: Date | null
  language?: 'EN' | 'FR'
  position?: string | null
  arrivalDate?: Date | null
  departureDate?: Date | null
  profilePhoto?: string | null
  profilePhotoKey?: string | null
  congesTotalDays?: number
  publicationsEmailOptOut?: boolean
  applications?: ActiveApplication[]
  adminApplications?: ActiveApplication[]
}

export async function updateUser(data: UpdateUserInput): Promise<UserWithAdminFields> {
  const { id, ...rest } = data
  return prisma.user.update({
    where: { id },
    data: rest,
    select: userWithAdminFieldsSelect,
  })
}

export async function updateUserWithAccessPeriods(
  data: UpdateUserInput,
  periods: AccessPeriodInput[],
): Promise<UserWithAdminFields> {
  const { id, ...rest } = data
  return prisma.$transaction(async (transaction) => {
    await transaction.user.update({ where: { id }, data: rest })
    await replaceAccessPeriodsWithClient(transaction, id, periods)
    return transaction.user.findUniqueOrThrow({
      where: { id },
      select: userWithAdminFieldsSelect,
    })
  })
}

export type CreatePlaceholderUserInput = {
  email: string
  role: 'ADMIN' | 'USER'
  firstName?: string | null
  lastName?: string | null
  language?: 'EN' | 'FR'
  position?: string | null
  applications?: ActiveApplication[]
  adminApplications?: ActiveApplication[]
  arrivalDate?: Date | null
  departureDate?: Date | null
  congesTotalDays?: number
  profilePhoto?: string | null
}

function placeholderUserData(id: string, data: CreatePlaceholderUserInput) {
  return {
    id,
    email: data.email,
    role: data.role,
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
    language: data.language ?? 'EN' as const,
    position: data.position ?? null,
    congesTotalDays: data.congesTotalDays ?? 0,
    applications: data.applications ?? [],
    adminApplications: data.adminApplications ?? [],
    arrivalDate: data.arrivalDate ?? null,
    departureDate: data.departureDate ?? null,
    profilePhoto: data.profilePhoto ?? null,
  }
}

export async function createPlaceholderUser(data: CreatePlaceholderUserInput): Promise<UserWithAdminFields> {
  const id = crypto.randomUUID()
  const created = await prisma.user.create({
    data: placeholderUserData(id, data),
    select: userWithAdminFieldsSelect,
  })
  return created
}

export async function createPlaceholderUserWithAccessPeriods(
  data: CreatePlaceholderUserInput,
  periods: AccessPeriodInput[],
): Promise<UserWithAdminFields> {
  const id = crypto.randomUUID()
  return prisma.$transaction(async (transaction) => {
    await transaction.user.create({ data: placeholderUserData(id, data) })
    await replaceAccessPeriodsWithClient(transaction, id, periods)
    return transaction.user.findUniqueOrThrow({
      where: { id },
      select: userWithAdminFieldsSelect,
    })
  })
}

export type UserWithOnboardingStatus = UserWithAdminFields & {
  onboardingStatus: InvitationStatus
  invitationExpiresAt?: Date
}

export async function listUsersWithOnboardingStatus(): Promise<UserWithOnboardingStatus[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      ...userWithAdminFieldsSelect,
      accounts: {
        select: {
          providerId: true,
          password: true,
        },
      },
    },
  })

  const userEmails = users.map((user) => user.email)
  const invitations = await prisma.verification.findMany({
    where: {
      identifier: { in: userEmails.map((email) => `INVITE:${email}`) },
    },
    select: {
      identifier: true,
      expiresAt: true,
    },
  })

  const invitationByEmail = new Map(
    invitations.map((invitation) => [
      invitation.identifier.replace('INVITE:', ''),
      invitation,
    ])
  )

  return users.map((user) => {
    const { accounts, ...userWithoutAccounts } = user
    const activated = accountsAreActivated(accounts)
    const invitation = invitationByEmail.get(user.email)

    let onboardingStatus: InvitationStatus = 'ACTIVE'
    let invitationExpiresAt: Date | undefined

    if (activated) {
      onboardingStatus = 'ACTIVE'
    } else if (invitation) {
      invitationExpiresAt = invitation.expiresAt
      if (new Date() > invitation.expiresAt) {
        onboardingStatus = 'INVITATION_EXPIRED'
      } else {
        onboardingStatus = 'INVITATION_SENT'
      }
    } else {
      onboardingStatus = 'INVITATION_EXPIRED'
    }

    return {
      ...userWithoutAccounts,
      onboardingStatus,
      invitationExpiresAt,
    }
  })
}
