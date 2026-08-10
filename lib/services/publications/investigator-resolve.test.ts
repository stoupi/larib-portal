import { describe, it, expect } from 'vitest'
import type { Prisma } from '@/app/generated/prisma'
import type { ClinicalTrialPerson } from './clinicaltrials'
import { loadInvestigatorIndex, matchInvestigator, previewInvestigatorResolutions } from './investigator-resolve'

type FakeAuthor = { id: string; firstName: string; lastName: string; email: string | null }

const BANK: FakeAuthor[] = [
  { id: 'pezel', firstName: 'Théo', lastName: 'Pezel', email: 'theo.pezel@aphp.fr' },
  { id: 'coisne', firstName: 'Augustin', lastName: 'Coisne', email: null },
  { id: 'martin-a', firstName: 'Alice', lastName: 'Martin', email: null },
  { id: 'martin-b', firstName: 'Antoine', lastName: 'Martin', email: null },
]

function fakeTx(authors: FakeAuthor[]) {
  const tx = {
    author: {
      findMany: async () => authors.map(({ id, firstName, lastName }) => ({ id, firstName, lastName })),
      findFirst: async ({ where }: { where: { OR?: Array<{ emails?: { has: string }; email?: { equals: string } }> } }) => {
        const wanted = where.OR?.[0]?.emails?.has
        if (!wanted) return null
        const found = authors.find((author) => author.email?.toLowerCase() === wanted.toLowerCase())
        return found ? { id: found.id, firstName: found.firstName, lastName: found.lastName } : null
      },
    },
  }
  return tx as unknown as Prisma.TransactionClient
}

function person(firstName: string, lastName: string, email: string | null = null): ClinicalTrialPerson {
  return { firstName, lastName, degrees: null, email, role: 'PI', centreName: null }
}

describe('matchInvestigator', () => {
  // ClinicalTrials.gov shouts surnames and drops accents; that must not create a duplicate.
  it('recognises a known author whatever the accents and the capitals', async () => {
    const tx = fakeTx([...BANK])
    const index = await loadInvestigatorIndex(tx)

    for (const incoming of [person('Theo', 'PEZEL'), person('THÉO', 'pezel'), person('Théo', 'Pezel')]) {
      const matched = await matchInvestigator(tx, index, incoming)
      expect(matched?.authorId, `${incoming.firstName} ${incoming.lastName}`).toBe('pezel')
    }
  })

  it('accepts an initial only when it points at a single person', async () => {
    const tx = fakeTx([...BANK])
    const index = await loadInvestigatorIndex(tx)

    expect((await matchInvestigator(tx, index, person('T.', 'Pezel')))?.authorId).toBe('pezel')
    expect(await matchInvestigator(tx, index, person('A.', 'Martin'))).toBeNull()
  })

  it('matches on the email before anything else, and reports an unknown person as new', async () => {
    const tx = fakeTx([...BANK])
    const index = await loadInvestigatorIndex(tx)

    expect((await matchInvestigator(tx, index, person('Wrong', 'Name', 'theo.pezel@aphp.fr')))?.authorId).toBe('pezel')
    expect(await matchInvestigator(tx, index, person('Nadia', 'Unknown'))).toBeNull()
  })

  it('previews each investigator with the name it resolved to', async () => {
    const tx = fakeTx([...BANK])

    const preview = await previewInvestigatorResolutions(tx, [person('Theo', 'PEZEL'), person('Nadia', 'Unknown')])

    expect(preview).toEqual([
      { key: 'theo|pezel', fullName: 'Theo PEZEL', degrees: null, matchedAuthorId: 'pezel', matchedName: 'Théo Pezel', status: 'existing' },
      { key: 'nadia|unknown', fullName: 'Nadia Unknown', degrees: null, matchedAuthorId: null, matchedName: null, status: 'new' },
    ])
  })
})
