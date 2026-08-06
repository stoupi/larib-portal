import { describe, expect, it } from 'vitest'
import { pubmedQueryPlan } from './pubmed-query'

describe('pubmedQueryPlan', () => {
  it('reads a single PMID or a list of them', () => {
    expect(pubmedQueryPlan('38412345')).toEqual({ kind: 'pmids', pmids: ['38412345'] })
    expect(pubmedQueryPlan(' 38412345, 12345678 ; 999 ')).toEqual({
      kind: 'pmids',
      pmids: ['38412345', '12345678', '999'],
    })
  })

  it('turns a DOI into an article-id search, even pasted as a URL', () => {
    expect(pubmedQueryPlan('10.1093/eurheartj/ehab123')).toEqual({
      kind: 'term',
      term: '"10.1093/eurheartj/ehab123"[AID]',
    })
    expect(pubmedQueryPlan('https://doi.org/10.1093/eurheartj/ehab123')).toEqual({
      kind: 'term',
      term: '"10.1093/eurheartj/ehab123"[AID]',
    })
  })

  it('passes anything else through as a PubMed term', () => {
    expect(pubmedQueryPlan('Pezel T')).toEqual({ kind: 'term', term: 'Pezel T' })
    expect(pubmedQueryPlan('multivalve heart disease[Title]')).toEqual({
      kind: 'term',
      term: 'multivalve heart disease[Title]',
    })
  })

  it('rejects an empty query', () => {
    expect(pubmedQueryPlan('   ')).toBeNull()
  })
})
