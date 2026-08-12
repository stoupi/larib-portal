import { describe, it, expect } from 'vitest'
import {
  idConverterUrl,
  europePmcPdfUrl,
  unpaywallUrl,
  readPmcId,
  readUnpaywallPdfUrl,
  looksLikePdf,
} from './open-access-pdf'

describe('idConverterUrl', () => {
  it('builds the NCBI id converter url from a bare pmid', () => {
    expect(idConverterUrl('34512303', null)).toBe(
      'https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/?ids=34512303&format=json&tool=larib-portal',
    )
  })

  it('adds the courtesy email when one is configured', () => {
    expect(idConverterUrl('34512303', 'contact@larib.test')).toContain('&email=contact%40larib.test')
  })

  it('rejects anything that is not a bare pmid', () => {
    expect(idConverterUrl('not-a-pmid', null)).toBeNull()
    expect(idConverterUrl('', null)).toBeNull()
  })

  it('accepts a pasted PubMed url or a PMID: prefix', () => {
    expect(idConverterUrl('PMID: 34512303', null)).toContain('ids=34512303')
    expect(idConverterUrl('https://pubmed.ncbi.nlm.nih.gov/34512303/', null)).toContain('ids=34512303')
  })
})

describe('europePmcPdfUrl', () => {
  it('builds the render url from a pmcid', () => {
    expect(europePmcPdfUrl('PMC8425557')).toBe('https://europepmc.org/articles/PMC8425557?pdf=render')
  })

  it('rejects a pmcid that is not shaped like one', () => {
    expect(europePmcPdfUrl('8425557')).toBeNull()
    expect(europePmcPdfUrl('../etc/passwd')).toBeNull()
  })
})

describe('unpaywallUrl', () => {
  it('keeps the doi slashes unescaped and carries the contact email', () => {
    expect(unpaywallUrl('10.3389/fnagi.2021.686506', 'contact@larib.test')).toBe(
      'https://api.unpaywall.org/v2/10.3389/fnagi.2021.686506?email=contact%40larib.test',
    )
  })

  it('strips a doi.org prefix before building the url', () => {
    expect(unpaywallUrl('https://doi.org/10.3389/fnagi.2021.686506', 'contact@larib.test')).toContain(
      '/v2/10.3389/fnagi.2021.686506',
    )
  })

  it('returns null without a contact email — the api refuses anonymous calls', () => {
    expect(unpaywallUrl('10.3389/fnagi.2021.686506', null)).toBeNull()
  })
})

describe('readPmcId', () => {
  it('reads the pmcid of a deposited article', () => {
    expect(readPmcId({ records: [{ pmcid: 'PMC8425557', pmid: 34512303 }] })).toBe('PMC8425557')
  })

  it('returns null when the article is not in PMC', () => {
    expect(readPmcId({ records: [{ pmid: 27141953, status: 'error', errmsg: 'Identifier not found in PMC' }] })).toBeNull()
    expect(readPmcId({ records: [] })).toBeNull()
    expect(readPmcId({})).toBeNull()
    expect(readPmcId(null)).toBeNull()
  })
})

describe('readUnpaywallPdfUrl', () => {
  it('prefers the best open access location', () => {
    const payload = {
      is_oa: true,
      best_oa_location: { url_for_pdf: 'https://example.test/best.pdf' },
      oa_locations: [{ url_for_pdf: 'https://example.test/other.pdf' }],
    }
    expect(readUnpaywallPdfUrl(payload)).toBe('https://example.test/best.pdf')
  })

  it('falls back to the first location that carries a pdf', () => {
    const payload = {
      is_oa: true,
      best_oa_location: { url_for_pdf: null, url: 'https://example.test/landing' },
      oa_locations: [{ url_for_pdf: null }, { url_for_pdf: 'https://example.test/repo.pdf' }],
    }
    expect(readUnpaywallPdfUrl(payload)).toBe('https://example.test/repo.pdf')
  })

  it('returns null for a closed article, an error body or junk', () => {
    expect(readUnpaywallPdfUrl({ is_oa: false, best_oa_location: null, oa_locations: [] })).toBeNull()
    expect(readUnpaywallPdfUrl({ error: true, message: 'Please use your own email address in API calls' })).toBeNull()
    expect(readUnpaywallPdfUrl(null)).toBeNull()
  })

  it('ignores a non-http url', () => {
    expect(readUnpaywallPdfUrl({ best_oa_location: { url_for_pdf: 'ftp://example.test/x.pdf' } })).toBeNull()
  })
})

describe('looksLikePdf', () => {
  const pdfHead = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])

  it('accepts a pdf content type with a %PDF header', () => {
    expect(looksLikePdf('application/pdf', pdfHead)).toBe(true)
    expect(looksLikePdf('application/pdf; charset=binary', pdfHead)).toBe(true)
  })

  it('accepts a %PDF header even when the server sends a vague content type', () => {
    expect(looksLikePdf('application/octet-stream', pdfHead)).toBe(true)
  })

  it('rejects a login page dressed as a pdf', () => {
    const html = new TextEncoder().encode('<!DOCTYPE html>')
    expect(looksLikePdf('application/pdf', html)).toBe(false)
    expect(looksLikePdf('text/html', html)).toBe(false)
  })

  it('rejects an empty body', () => {
    expect(looksLikePdf('application/pdf', new Uint8Array())).toBe(false)
  })
})
