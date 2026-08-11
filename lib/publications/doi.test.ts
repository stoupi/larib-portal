import { describe, expect, it } from 'vitest'
import { bareDoi, doiUrl } from './doi'

describe('doiUrl', () => {
  it('links a bare DOI', () => {
    expect(doiUrl('10.1093/ehjci/jeaa123')).toBe('https://doi.org/10.1093/ehjci/jeaa123')
  })

  it('does not double the resolver when the DOI was stored as a URL or with a prefix', () => {
    expect(doiUrl('https://doi.org/10.1093/x')).toBe('https://doi.org/10.1093/x')
    expect(doiUrl('http://dx.doi.org/10.1093/x')).toBe('https://doi.org/10.1093/x')
    expect(doiUrl('doi: 10.1093/x')).toBe('https://doi.org/10.1093/x')
  })

  it('treats a missing or blank DOI as no link', () => {
    expect(doiUrl(null)).toBeNull()
    expect(doiUrl('   ')).toBeNull()
    expect(bareDoi('  10.1/x ')).toBe('10.1/x')
  })
})
