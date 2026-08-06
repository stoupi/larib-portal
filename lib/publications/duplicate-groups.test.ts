import { describe, expect, it } from 'vitest'
import { authorDuplicateKey, duplicateGroups, journalDuplicateKey } from './duplicate-groups'

describe('authorDuplicateKey', () => {
  it('pairs the same person whatever the case, accents or full first name', () => {
    expect(authorDuplicateKey({ firstName: 'Alexandre', lastName: 'Pfeffer' })).toBe(
      authorDuplicateKey({ firstName: 'A', lastName: 'PFEFFER' }),
    )
    expect(authorDuplicateKey({ firstName: 'Théo', lastName: 'Pézel' })).toBe(
      authorDuplicateKey({ firstName: 'Theo', lastName: 'Pezel' }),
    )
  })

  it('keeps homonyms with different first initials apart', () => {
    expect(authorDuplicateKey({ firstName: 'Marie', lastName: 'Pfeffer' })).not.toBe(
      authorDuplicateKey({ firstName: 'Alexandre', lastName: 'Pfeffer' }),
    )
  })
})

describe('journalDuplicateKey', () => {
  it('pairs journals sharing an ISSN, whatever the punctuation of the name', () => {
    expect(journalDuplicateKey({ name: 'Eur Heart J', issn: '0195-668X' })).toBe(
      journalDuplicateKey({ name: 'European Heart Journal', issn: '0195668x' }),
    )
  })

  it('falls back to the name when no ISSN is known', () => {
    expect(journalDuplicateKey({ name: 'Arch. Cardiovasc. Dis.', issn: null })).toBe(
      journalDuplicateKey({ name: 'Arch Cardiovasc Dis', issn: null }),
    )
    expect(journalDuplicateKey({ name: 'Circulation', issn: null })).not.toBe(
      journalDuplicateKey({ name: 'Circulation Imaging', issn: null }),
    )
  })
})

describe('duplicateGroups', () => {
  it('keeps only the keys shared by several entries, biggest group first', () => {
    const groups = duplicateGroups([
      { id: '1', label: 'A', key: 'k1' },
      { id: '2', label: 'B', key: 'k1' },
      { id: '3', label: 'C', key: 'k1' },
      { id: '4', label: 'D', key: 'k2' },
      { id: '5', label: 'E', key: 'k2' },
      { id: '6', label: 'F', key: 'k3' },
    ])
    expect(groups.map((group) => group.key)).toEqual(['k1', 'k2'])
    expect(groups[0].members).toHaveLength(3)
  })

  it('returns nothing when every entry is unique', () => {
    expect(duplicateGroups([{ id: '1', label: 'A', key: 'k1' }])).toEqual([])
  })
})
