import { describe, it, expect } from 'vitest'
import type { PubmedAuthor } from '@/types/publications'
import {
  authorIsViewer,
  viewerIsAmongAuthors,
  draftFieldsReplacedByImport,
  defaultPubmedQueryForViewer,
  type DraftSummary,
} from './pubmed-import'

function author(partial: Partial<PubmedAuthor> & { lastName: string }): PubmedAuthor {
  return { foreName: null, initials: null, affiliation: null, orcid: null, ...partial }
}

describe('authorIsViewer', () => {
  it('matches on last name plus first initial', () => {
    expect(authorIsViewer(author({ lastName: 'Pezel', initials: 'T' }), { firstName: 'Theo', lastName: 'Pezel' })).toBe(true)
  })

  it('ignores accents and casing', () => {
    expect(authorIsViewer(author({ lastName: 'TOUPIN', foreName: 'Solenn' }), { firstName: 'Solenn', lastName: 'Toupin' })).toBe(true)
    expect(authorIsViewer(author({ lastName: 'Lievre', initials: 'M' }), { firstName: 'Marie', lastName: 'Lièvre' })).toBe(true)
  })

  it('rejects a homonym with a different first initial', () => {
    expect(authorIsViewer(author({ lastName: 'Pezel', initials: 'A' }), { firstName: 'Theo', lastName: 'Pezel' })).toBe(false)
  })

  it('accepts when either side has no fore name at all', () => {
    expect(authorIsViewer(author({ lastName: 'Pezel' }), { firstName: 'Theo', lastName: 'Pezel' })).toBe(true)
    expect(authorIsViewer(author({ lastName: 'Pezel', initials: 'T' }), { firstName: '', lastName: 'Pezel' })).toBe(true)
  })

  it('rejects a viewer with no last name rather than matching everybody', () => {
    expect(authorIsViewer(author({ lastName: 'Pezel', initials: 'T' }), { firstName: 'Theo', lastName: '' })).toBe(false)
  })

  it('prefers the stored initials over the fore name', () => {
    expect(authorIsViewer(author({ lastName: 'Pezel', initials: 'T' }), { firstName: 'Alexandre', lastName: 'Pezel', initials: 'T' })).toBe(true)
  })
})

describe('viewerIsAmongAuthors', () => {
  const record = [
    author({ lastName: 'Garot', initials: 'J' }),
    author({ lastName: 'Toupin', initials: 'S' }),
    author({ lastName: 'Pezel', initials: 'T' }),
  ]

  it('finds the viewer anywhere in the list', () => {
    expect(viewerIsAmongAuthors(record, { firstName: 'Solenn', lastName: 'Toupin' })).toBe(true)
  })

  it('returns false when the viewer did not sign the paper', () => {
    expect(viewerIsAmongAuthors(record, { firstName: 'Camille', lastName: 'Durand' })).toBe(false)
  })

  it('returns false on an empty author list', () => {
    expect(viewerIsAmongAuthors([], { firstName: 'Solenn', lastName: 'Toupin' })).toBe(false)
  })
})

describe('draftFieldsReplacedByImport', () => {
  const record = {
    title: 'Cardiac MRI in amyloidosis',
    journalName: 'Circulation',
    doi: '10.1161/abc',
    abstract: 'Background…',
    publishedAt: '2026-01-15',
  }

  const emptyDraft: DraftSummary = {
    title: '',
    journalName: null,
    doi: null,
    abstract: null,
    otherAuthorCount: 0,
    publishedAt: null,
  }

  it('warns about nothing on an untouched draft', () => {
    expect(draftFieldsReplacedByImport(emptyDraft, record)).toEqual([])
  })

  it('lists every field the record would overwrite', () => {
    const filled: DraftSummary = {
      title: 'My working title',
      journalName: 'JACC',
      doi: '10.1016/xyz',
      abstract: 'Draft abstract',
      otherAuthorCount: 3,
      publishedAt: '2025-06-01',
    }
    expect(draftFieldsReplacedByImport(filled, record)).toEqual(['title', 'journal', 'doi', 'abstract', 'authors', 'dates'])
  })

  it('stays silent when the draft already holds the same values', () => {
    const identical: DraftSummary = {
      title: '  Cardiac MRI in amyloidosis  ',
      journalName: 'Circulation',
      doi: '10.1161/abc',
      abstract: 'Background…',
      otherAuthorCount: 0,
      publishedAt: '2026-01-15',
    }
    expect(draftFieldsReplacedByImport(identical, record)).toEqual([])
  })

  it('warns about authors as soon as the draft holds one beyond its creator, since the list is replaced wholesale', () => {
    expect(draftFieldsReplacedByImport({ ...emptyDraft, otherAuthorCount: 1 }, record)).toEqual(['authors'])
  })
})

describe('defaultPubmedQueryForViewer', () => {
  it('builds a PubMed author query from the viewer name', () => {
    expect(defaultPubmedQueryForViewer({ firstName: 'Solenn', lastName: 'Toupin' })).toBe('Toupin S')
  })

  it('falls back to the last name alone when no fore name is known', () => {
    expect(defaultPubmedQueryForViewer({ firstName: '', lastName: 'Toupin' })).toBe('Toupin')
  })

  it('returns an empty query when the viewer has no last name', () => {
    expect(defaultPubmedQueryForViewer({ firstName: 'Solenn', lastName: '' })).toBe('')
  })
})
