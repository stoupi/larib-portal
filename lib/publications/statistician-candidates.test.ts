import { describe, it, expect } from 'vitest'
import { partitionStatisticianCandidates } from './author-picker'
import type { PickerAuthor } from './author-picker'

const author = (id: string, lastName: string): PickerAuthor => ({
  id,
  firstName: 'Test',
  lastName,
  initials: null,
  degrees: null,
  centreName: null,
  isOurTeam: false,
  publicationCount: 0,
})

const bank = [author('a', 'Alpha'), author('b', 'Bravo'), author('c', 'Charlie')]

describe('partitionStatisticianCandidates', () => {
  it('puts the publication signers first, in signing order', () => {
    const { signatories } = partitionStatisticianCandidates(bank, ['c', 'a'])
    expect(signatories.map((candidate) => candidate.id)).toEqual(['c', 'a'])
  })

  it('keeps the rest of the bank reachable', () => {
    const { others } = partitionStatisticianCandidates(bank, ['c', 'a'])
    expect(others.map((candidate) => candidate.id)).toEqual(['b'])
  })

  it('leaves everyone under "others" when the publication has no author yet', () => {
    const { signatories, others } = partitionStatisticianCandidates(bank, [])
    expect(signatories).toEqual([])
    expect(others).toHaveLength(3)
  })

  it('ignores a signer who is not in the bank being offered', () => {
    const { signatories } = partitionStatisticianCandidates([author('a', 'Alpha')], ['zzz', 'a'])
    expect(signatories.map((candidate) => candidate.id)).toEqual(['a'])
  })
})
