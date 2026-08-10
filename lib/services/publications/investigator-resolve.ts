import type { Prisma } from '@/app/generated/prisma'
import type { ClinicalTrialPerson } from './clinicaltrials'
import { normalizeName } from './import-dedupe'

type Tx = Prisma.TransactionClient

export type AuthorOption = { id: string; firstName: string; lastName: string }

export type InvestigatorMatch = { authorId: string; firstName: string; lastName: string }

export function investigatorKey(person: Pick<ClinicalTrialPerson, 'firstName' | 'lastName'>): string {
  return `${person.firstName}|${person.lastName}`.toLowerCase()
}

// ClinicalTrials.gov writes "Theo PEZEL" where the bank holds "Théo Pezel": accents and
// capitals must not decide whether a person is already known, so both sides are folded to
// plain lowercase letters before they are compared.
function fullNameKey(person: { firstName: string; lastName: string }): string {
  return `${normalizeName(person.firstName)}|${normalizeName(person.lastName)}`
}

function surnameInitialKey(person: { firstName: string; lastName: string }): string {
  return `${normalizeName(person.lastName)}|${normalizeName(person.firstName).charAt(0)}`
}

export type InvestigatorIndex = {
  byFullName: Map<string, AuthorOption>
  bySurnameInitial: Map<string, AuthorOption[]>
}

export async function loadInvestigatorIndex(tx: Tx): Promise<InvestigatorIndex> {
  const authors = await listAuthorOptions(tx)
  const byFullName = new Map<string, AuthorOption>()
  const bySurnameInitial = new Map<string, AuthorOption[]>()
  for (const author of authors) {
    const fullKey = fullNameKey(author)
    if (fullKey !== '|' && !byFullName.has(fullKey)) byFullName.set(fullKey, author)
    const initialKey = surnameInitialKey(author)
    bySurnameInitial.set(initialKey, [...(bySurnameInitial.get(initialKey) ?? []), author])
  }
  return { byFullName, bySurnameInitial }
}

// The one matching rule shared by the preview and the import, so what an admin is shown
// before importing is exactly what the import will do.
export async function matchInvestigator(
  tx: Tx,
  index: InvestigatorIndex,
  person: Pick<ClinicalTrialPerson, 'firstName' | 'lastName' | 'email'>,
): Promise<InvestigatorMatch | null> {
  const byEmail = person.email
    ? await tx.author.findFirst({
        where: { OR: [{ emails: { has: person.email } }, { email: { equals: person.email, mode: 'insensitive' } }] },
        select: { id: true, firstName: true, lastName: true },
      })
    : null
  if (byEmail) return { authorId: byEmail.id, firstName: byEmail.firstName, lastName: byEmail.lastName }

  const exact = index.byFullName.get(fullNameKey(person))
  if (exact) return { authorId: exact.id, firstName: exact.firstName, lastName: exact.lastName }

  // "T. Pezel" and "Théo Pezel" are the same person, but only when nobody else in the bank
  // shares that surname and initial — otherwise the choice belongs to the admin.
  const sameSurname = index.bySurnameInitial.get(surnameInitialKey(person)) ?? []
  if (sameSurname.length === 1) {
    const [only] = sameSurname
    return { authorId: only.id, firstName: only.firstName, lastName: only.lastName }
  }
  return null
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
  const index = await loadInvestigatorIndex(tx)
  const previews: InvestigatorPreview[] = []
  for (const person of people) {
    const matched = await matchInvestigator(tx, index, person)
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

export async function listAuthorOptions(tx: Tx): Promise<AuthorOption[]> {
  return tx.author.findMany({ orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }], select: { id: true, firstName: true, lastName: true } })
}
