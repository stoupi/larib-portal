import { describe, it, expect } from 'vitest'
import {
  idConverterUrl,
  europePmcPdfUrl,
  unpaywallUrl,
  readPmcId,
  readUnpaywallPdfUrl,
  isPublicHttpUrl,
  looksLikePdf,
  readCappedBody,
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

  it('returns null when the article carries no pmcid', () => {
    expect(europePmcPdfUrl(null)).toBeNull()
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

  it('refuses a doi that would hijack our query string', () => {
    expect(unpaywallUrl('10.3389/fnagi.2021.686506?email=attacker@evil.test&', 'contact@larib.test')).toBeNull()
    expect(unpaywallUrl('10.3389/fnagi.2021.686506#', 'contact@larib.test')).toBeNull()
  })

  it('refuses anything that is not shaped like a doi', () => {
    expect(unpaywallUrl('../../evil', 'contact@larib.test')).toBeNull()
    expect(unpaywallUrl('not-a-doi', 'contact@larib.test')).toBeNull()
    expect(unpaywallUrl('10.1/x', 'contact@larib.test')).toBeNull()
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

  it('steps over junk entries instead of throwing on them', () => {
    expect(readPmcId({ records: [null, 'junk', { pmcid: 'PMC8425557' }] })).toBe('PMC8425557')
    expect(readPmcId({ records: [null, 'junk'] })).toBeNull()
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

  it('returns null when no location carries a pdf url at all', () => {
    expect(readUnpaywallPdfUrl({ is_oa: false, best_oa_location: null, oa_locations: [] })).toBeNull()
    expect(readUnpaywallPdfUrl({ error: true, message: 'Please use your own email address in API calls' })).toBeNull()
    expect(readUnpaywallPdfUrl(null)).toBeNull()
  })

  it('ignores a non-http url', () => {
    expect(readUnpaywallPdfUrl({ best_oa_location: { url_for_pdf: 'ftp://example.test/x.pdf' } })).toBeNull()
  })

  it('steps over junk locations instead of throwing on them', () => {
    expect(readUnpaywallPdfUrl({ oa_locations: [null, { url_for_pdf: 'https://example.test/repo.pdf' }] })).toBe(
      'https://example.test/repo.pdf',
    )
  })

  it('drops a location aimed at an internal host and keeps looking', () => {
    const payload = {
      best_oa_location: { url_for_pdf: 'http://169.254.169.254/latest/meta-data/' },
      oa_locations: [{ url_for_pdf: 'https://example.test/repo.pdf' }],
    }
    expect(readUnpaywallPdfUrl(payload)).toBe('https://example.test/repo.pdf')
  })
})

describe('isPublicHttpUrl', () => {
  it('accepts a public http or https url', () => {
    expect(isPublicHttpUrl('https://example.test/best.pdf')).toBe(true)
    expect(isPublicHttpUrl('http://europepmc.org/articles/PMC8425557?pdf=render')).toBe(true)
  })

  it('refuses a private, loopback or link-local host', () => {
    const privateUrls = [
      'http://localhost/x.pdf',
      'http://localhost:8080/x.pdf',
      'http://127.0.0.1/x.pdf',
      'http://10.0.0.5/x.pdf',
      'http://192.168.1.10/x.pdf',
      'http://172.16.0.3/x.pdf',
      'http://172.31.255.254/x.pdf',
      'http://169.254.169.254/latest/meta-data/',
      'http://0.0.0.0/x.pdf',
      'http://[::1]/x.pdf',
      'https://vault.internal/x.pdf',
      'https://printer.local/x.pdf',
    ]
    for (const privateUrl of privateUrls) {
      expect(isPublicHttpUrl(privateUrl)).toBe(false)
    }
  })

  it('refuses the same private addresses written as ipv6 literals', () => {
    const privateUrls = [
      'http://[::ffff:169.254.169.254]/latest/meta-data/',
      'http://[::ffff:127.0.0.1]/x.pdf',
      'http://[::ffff:10.0.0.1]/x.pdf',
      'http://[::ffff:192.168.0.1]/x.pdf',
      'http://[::ffff:7f00:1]/x.pdf',
      'http://[0:0:0:0:0:ffff:127.0.0.1]/x.pdf',
      'http://[::127.0.0.1]/x.pdf',
      'http://[fd00::1]/x.pdf',
      'http://[fe80::1]/x.pdf',
      'http://[::]/x.pdf',
    ]
    for (const privateUrl of privateUrls) {
      expect(isPublicHttpUrl(privateUrl)).toBe(false)
    }
  })

  it('refuses a subdomain of localhost, which always resolves to loopback', () => {
    expect(isPublicHttpUrl('http://foo.localhost/x.pdf')).toBe(false)
  })

  it('keeps a public host that merely reads like a private range', () => {
    expect(isPublicHttpUrl('https://172.15.0.1/x.pdf')).toBe(true)
    expect(isPublicHttpUrl('https://172.32.0.1/x.pdf')).toBe(true)
    expect(isPublicHttpUrl('https://10x.genomics.test/x.pdf')).toBe(true)
    expect(isPublicHttpUrl('https://172.example.com/x.pdf')).toBe(true)
    expect(isPublicHttpUrl('https://localhost.example.com/x.pdf')).toBe(true)
    expect(isPublicHttpUrl('https://www.internal-medicine.org/x.pdf')).toBe(true)
    expect(isPublicHttpUrl('https://[2001:4860:4860::8888]/x.pdf')).toBe(true)
  })

  it('refuses a non-http scheme', () => {
    expect(isPublicHttpUrl('ftp://example.test/x.pdf')).toBe(false)
    expect(isPublicHttpUrl('file:///etc/passwd')).toBe(false)
  })

  it('returns false for a malformed url instead of throwing', () => {
    expect(isPublicHttpUrl('http://')).toBe(false)
    expect(isPublicHttpUrl('not a url')).toBe(false)
    expect(isPublicHttpUrl('')).toBe(false)
    expect(isPublicHttpUrl(null)).toBe(false)
    expect(isPublicHttpUrl(undefined)).toBe(false)
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
    expect(looksLikePdf('application/x-download', pdfHead)).toBe(true)
    expect(looksLikePdf(null, pdfHead)).toBe(true)
  })

  it('rejects a document content type even when the bytes start with %PDF', () => {
    expect(looksLikePdf('text/html', pdfHead)).toBe(false)
    expect(looksLikePdf('application/json', pdfHead)).toBe(false)
    expect(looksLikePdf('application/xml; charset=utf-8', pdfHead)).toBe(false)
    expect(looksLikePdf('text/plain', pdfHead)).toBe(false)
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

describe('readCappedBody', () => {
  type InstrumentedStream = {
    stream: ReadableStream<Uint8Array>
    pulledChunks: () => number
    wasCancelled: () => boolean
  }

  function streamOf(chunks: Uint8Array[]): InstrumentedStream {
    let pulled = 0
    let cancelled = false
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pulled >= chunks.length) {
          controller.close()
          return
        }
        controller.enqueue(chunks[pulled])
        pulled += 1
      },
      cancel() {
        cancelled = true
      },
    })
    return { stream, pulledChunks: () => pulled, wasCancelled: () => cancelled }
  }

  function filled(length: number, value: number): Uint8Array {
    return new Uint8Array(length).fill(value)
  }

  it('reads a body that sits exactly on the cap', async () => {
    const { stream } = streamOf([filled(10, 7)])
    const bytes = await readCappedBody(stream, 10)
    expect(bytes).not.toBeNull()
    expect(bytes?.byteLength).toBe(10)
    expect(Array.from(bytes ?? [])).toEqual(Array.from(filled(10, 7)))
  })

  it('rejects a body one byte over the cap', async () => {
    const { stream } = streamOf([filled(11, 7)])
    expect(await readCappedBody(stream, 10)).toBeNull()
  })

  it('joins a body split across many chunks in order', async () => {
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3]), new Uint8Array([4, 5, 6])]
    const { stream } = streamOf(chunks)
    const bytes = await readCappedBody(stream, 100)
    expect(Array.from(bytes ?? [])).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('rejects when the cap is crossed only by the sum of the chunks', async () => {
    const { stream } = streamOf([filled(4, 1), filled(4, 2), filled(4, 3)])
    expect(await readCappedBody(stream, 10)).toBeNull()
  })

  it('returns an empty body untouched rather than rejecting it', async () => {
    const { stream } = streamOf([])
    const bytes = await readCappedBody(stream, 10)
    expect(bytes).not.toBeNull()
    expect(bytes?.byteLength).toBe(0)
  })

  it('cancels the reader on overflow instead of draining the rest of the body', async () => {
    const oversized = streamOf([filled(8, 1), filled(8, 2), filled(8, 3), filled(8, 4)])
    expect(await readCappedBody(oversized.stream, 10)).toBeNull()
    expect(oversized.wasCancelled()).toBe(true)
    expect(oversized.pulledChunks()).toBeLessThan(4)
  })
})
