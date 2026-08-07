import { describe, it, expect } from 'vitest'
import { normalizeName, authorDedupeKey, pickAuthorMatch } from './import-dedupe'

describe('normalizeName', () => {
  it('lowercases and strips accents/punctuation', () => {
    expect(normalizeName('Pézel-Théo')).toBe('pezeltheo')
    expect(normalizeName("O'Brien")).toBe('obrien')
  })
})

describe('authorDedupeKey', () => {
  it('uses ORCID when present', () => {
    expect(authorDedupeKey({ lastName: 'Pezel', foreName: 'Theo', initials: 'T', affiliation: null, orcid: '0000-0002-1234-5678' }))
      .toBe('orcid:0000-0002-1234-5678')
  })
  it('falls back to lastName + first initial', () => {
    expect(authorDedupeKey({ lastName: 'Pezel', foreName: 'Theo', initials: 'T', affiliation: null, orcid: null }))
      .toBe('name:pezel|t')
    expect(authorDedupeKey({ lastName: 'Pezel', foreName: null, initials: 'TA', affiliation: null, orcid: null }))
      .toBe('name:pezel|t')
  })
})

describe('pickAuthorMatch', () => {
  const stored = {
    id: 'existing',
    firstName: 'Alexandre',
    lastName: 'Pfeffer',
    initials: 'A',
    orcid: null,
  }

  it('reuses the stored author when the PubMed record brings a new ORCID', () => {
    expect(pickAuthorMatch([stored], { lastName: 'Pfeffer', initials: 'A', orcid: '0009-0006-4643-1772' })?.id).toBe(
      'existing',
    )
  })

  it('prefers the ORCID match over a homonym', () => {
    const homonym = { id: 'other', firstName: 'Anne', lastName: 'Pfeffer', initials: 'A', orcid: null }
    const withOrcid = { ...stored, id: 'orcid-one', orcid: '0009-0006-4643-1772' }
    expect(pickAuthorMatch([homonym, withOrcid], { lastName: 'Pfeffer', initials: 'A', orcid: '0009-0006-4643-1772' })?.id)
      .toBe('orcid-one')
  })

  it('matches whatever the case and the accents', () => {
    const accented = { id: 'accented', firstName: 'Théo', lastName: 'PÉZEL', initials: null, orcid: null }
    expect(pickAuthorMatch([accented], { lastName: 'Pezel', initials: 'T' })?.id).toBe('accented')
  })

  it('keeps two people apart when their ORCIDs differ', () => {
    const withOrcid = { ...stored, orcid: '0000-0000-0000-0001' }
    expect(pickAuthorMatch([withOrcid], { lastName: 'Pfeffer', initials: 'A', orcid: '0009-0006-4643-1772' })).toBeNull()
  })

  it('keeps two people apart when their first initials differ', () => {
    expect(pickAuthorMatch([stored], { lastName: 'Pfeffer', initials: 'M' })).toBeNull()
  })
})
