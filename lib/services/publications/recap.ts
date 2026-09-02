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
