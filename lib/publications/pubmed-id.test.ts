import { describe, expect, it } from 'vitest'
import { barePubmedId, pubmedUrl } from './pubmed-id'

describe('pubmedUrl', () => {
  it('links a bare PMID', () => {
    expect(pubmedUrl('39123456')).toBe('https://pubmed.ncbi.nlm.nih.gov/39123456/')
  })

  it('accepts a prefixed PMID or a pasted PubMed URL', () => {
    expect(pubmedUrl('PMID: 39123456')).toBe('https://pubmed.ncbi.nlm.nih.gov/39123456/')
    expect(pubmedUrl('https://pubmed.ncbi.nlm.nih.gov/39123456/')).toBe(
      'https://pubmed.ncbi.nlm.nih.gov/39123456/',
    )
  })

  it('refuses to build a link out of something that is not a PMID', () => {
    expect(pubmedUrl(null)).toBeNull()
    expect(pubmedUrl('  ')).toBeNull()
    expect(pubmedUrl('not-a-pmid')).toBeNull()
    expect(barePubmedId(' 39123456 ')).toBe('39123456')
  })
})
