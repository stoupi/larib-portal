import type { Prisma } from '@/app/generated/prisma'
import type { ClinicalTrialPerson } from './clinicaltrials'

type Tx = Prisma.TransactionClient

export type InvestigatorMatch = { authorId: string; firstName: string; lastName: string }

export function investigatorKey(person: Pick<ClinicalTrialPerson, 'firstName' | 'lastName'>): string {
  return `${person.firstName}|${person.lastName}`.toLowerCase()
}

// The one matching rule shared by the preview and the import, so what an admin is shown
// before importing is exactly what the import will do.
export async function matchInvestigator(tx: Tx, person: Pick<ClinicalTrialPerson, 'firstName' | 'lastName' | 'email'>): Promise<InvestigatorMatch | null> {
  const byEmail = person.email
    ? await tx.author.findFirst({
        where: { OR: [{ emails: { has: person.email } }, { email: { equals: person.email, mode: 'insensitive' } }] },
        select: { id: true, firstName: true, lastName: true },
      })
    : null
  const author = byEmail ?? await tx.author.findFirst({
    where: { firstName: { equals: person.firstName, mode: 'insensitive' }, lastName: { equals: person.lastName, mode: 'insensitive' } },
    select: { id: true, firstName: true, lastName: true },
  })
  return author ? { authorId: author.id, firstName: author.firstName, lastName: author.lastName } : null
}

export type InvestigatorPreview = {
  key: string
  fullName: string
  degrees: string | null
  matchedAuthorId: string | null
  matchedName: string | null
  status: 'existing' | 'new'
}

export async function previewInvestigatorResolutions(tx: Tx, people: ClinicalTrialPerson[]): Promise<InvestigatorPreview[]> {
  const previews: InvestigatorPreview[] = []
  for (const person of people) {
    const matched = await matchInvestigator(tx, person)
    previews.push({
      key: investigatorKey(person),
      fullName: `${person.firstName} ${person.lastName}`,
      degrees: person.degrees,
      matchedAuthorId: matched?.authorId ?? null,
      matchedName: matched ? `${matched.firstName} ${matched.lastName}` : null,
      status: matched ? 'existing' : 'new',
    })
  }
  return previews
}

export type AuthorOption = { id: string; firstName: string; lastName: string }

export async function listAuthorOptions(tx: Tx): Promise<AuthorOption[]> {
  return tx.author.findMany({ orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }], select: { id: true, firstName: true, lastName: true } })
}
