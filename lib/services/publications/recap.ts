import { prisma } from '@/lib/prisma'
import { filterActiveAppMembers } from '@/lib/permissions'

export type PublicationsRecapRecipient = {
  id: string
  email: string
  firstName: string | null
  language: 'EN' | 'FR'
}

export async function getPublicationsRecapRecipients(): Promise<PublicationsRecapRecipient[]> {
  const candidates = await prisma.user.findMany({
    where: {
      applications: { has: 'PUBLICATIONS' },
      publicationsEmailOptOut: false,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      language: true,
      role: true,
      applications: true,
      adminApplications: true,
      accessPeriods: { select: { application: true, startsAt: true, endsAt: true } },
    },
  })
  return filterActiveAppMembers(candidates, 'PUBLICATIONS').map((candidate) => ({
    id: candidate.id,
    email: candidate.email,
    firstName: candidate.firstName,
    language: candidate.language,
  }))
}

export type RecapAudienceMember = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  language: 'EN' | 'FR'
  optedOut: boolean
  lastRecapAt: string | null
}

// Everyone the recap could reach, opted out or not: suspending someone is a decision
// an admin makes here, so the people they can suspend must be visible.
export async function listRecapAudience(): Promise<RecapAudienceMember[]> {
  const candidates = await prisma.user.findMany({
    where: { applications: { has: 'PUBLICATIONS' } },
    orderBy: [{ lastName: 'asc' }, { email: 'asc' }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      language: true,
      role: true,
      applications: true,
      adminApplications: true,
      publicationsEmailOptOut: true,
      accessPeriods: { select: { application: true, startsAt: true, endsAt: true } },
    },
  })

  const active = filterActiveAppMembers(candidates, 'PUBLICATIONS')
  // Matched on the recipient, not the sender: a manual send is signed by the admin who
  // triggered it, which says nothing about who received it.
  const sent = await prisma.publicationEmail.findMany({
    where: { kind: 'MONTHLY_RECAP', status: 'SENT' },
    orderBy: { sentAt: 'desc' },
    select: { toEmails: true, sentAt: true },
  })
  const lastByEmail = new Map<string, Date>()
  for (const email of sent) {
    for (const recipient of email.toEmails) {
      if (!lastByEmail.has(recipient)) lastByEmail.set(recipient, email.sentAt)
    }
  }

  return active.map((member) => ({
    id: member.id,
    email: member.email,
    firstName: member.firstName,
    lastName: member.lastName,
    language: member.language,
    optedOut: member.publicationsEmailOptOut,
    lastRecapAt: lastByEmail.get(member.email)?.toISOString() ?? null,
  }))
}

export async function setPublicationsRecapOptOut(userId: string, optedOut: boolean): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { publicationsEmailOptOut: optedOut } })
}

const SETTINGS_ID = 'singleton'

export async function listRecapCopyRecipients(): Promise<string[]> {
  const settings = await prisma.publicationSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { recapCcEmails: true },
  })
  return settings?.recapCcEmails ?? []
}

export async function setRecapCopyRecipients(emails: string[]): Promise<string[]> {
  const cleaned = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))]
  const settings = await prisma.publicationSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, recapCcEmails: cleaned },
    update: { recapCcEmails: cleaned },
    select: { recapCcEmails: true },
  })
  return settings.recapCcEmails
}
