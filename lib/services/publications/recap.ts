import { prisma } from '@/lib/prisma'

export type PublicationsRecapRecipient = {
  id: string
  email: string
  firstName: string | null
  language: 'EN' | 'FR'
}

export async function getPublicationsRecapRecipients(): Promise<PublicationsRecapRecipient[]> {
  return prisma.user.findMany({
    where: {
      applications: { has: 'PUBLICATIONS' },
      publicationsEmailOptOut: false,
    },
    select: { id: true, email: true, firstName: true, language: true },
  })
}
