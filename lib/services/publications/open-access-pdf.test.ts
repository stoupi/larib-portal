import { describe, it, expect, vi, afterEach } from 'vitest'
import { findOpenAccessPdf } from './open-access-pdf'

const readFileMock = vi.hoisted(() => vi.fn<(path: string, encoding: string) => Promise<string>>())

vi.mock('node:fs/promises', () => ({ readFile: readFileMock }))

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  readFileMock.mockReset()
})

describe('findOpenAccessPdf', () => {
  it('returns the Europe PMC url when the pmid is deposited in PMC', async () => {
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', 'contact@larib.test')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ records: [{ pmcid: 'PMC8425557' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const found = await findOpenAccessPdf({ pubmedId: '34512303', doi: '10.3389/fnagi.2021.686506' })

    expect(found).toEqual({ url: 'https://europepmc.org/articles/PMC8425557?pdf=render', source: 'europepmc' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to Unpaywall when the article is not in PMC', async () => {
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', 'contact@larib.test')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ records: [{ status: 'error', errmsg: 'Identifier not found in PMC' }] }))
      .mockResolvedValueOnce(jsonResponse({ is_oa: true, best_oa_location: { url_for_pdf: 'https://example.test/a.pdf' } }))
    vi.stubGlobal('fetch', fetchMock)

    const found = await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })

    expect(found).toEqual({ url: 'https://example.test/a.pdf', source: 'unpaywall' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns null when neither source has a pdf', async () => {
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', 'contact@larib.test')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ records: [{ status: 'error' }] }))
        .mockResolvedValueOnce(jsonResponse({ is_oa: false, best_oa_location: null, oa_locations: [] })),
    )

    expect(await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })).toBeNull()
  })

  it('keeps going when a source fails on the network', async () => {
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', 'contact@larib.test')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce(jsonResponse({ best_oa_location: { url_for_pdf: 'https://example.test/a.pdf' } })),
    )

    const found = await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })
    expect(found?.source).toBe('unpaywall')
  })

  it('skips Unpaywall when no contact email is configured', async () => {
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', '')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ records: [{ status: 'error' }] }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns null without querying anything when both identifiers are missing', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await findOpenAccessPdf({ pubmedId: null, doi: null })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats a non-ok response as an unavailable source', async () => {
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', 'contact@larib.test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 503 })))

    expect(await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })).toBeNull()
  })

  it('resolves the fixture origin marker and never touches the network', async () => {
    vi.stubEnv('OPEN_ACCESS_FIXTURE_DIR', '/fixtures/open-access')
    vi.stubEnv('OPEN_ACCESS_FIXTURE_ORIGIN', 'http://localhost:3100')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    readFileMock.mockResolvedValue(
      JSON.stringify({ '34512303': { url: '{origin}/test-open-access-sample.pdf', source: 'europepmc' } }),
    )

    const found = await findOpenAccessPdf({ pubmedId: '34512303', doi: '10.3389/fnagi.2021.686506' })

    expect(found).toEqual({ url: 'http://localhost:3100/test-open-access-sample.pdf', source: 'europepmc' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns null when the fixture has no entry for either identifier', async () => {
    vi.stubEnv('OPEN_ACCESS_FIXTURE_DIR', '/fixtures/open-access')
    readFileMock.mockResolvedValue(
      JSON.stringify({ '99999999': { url: 'https://example.test/other.pdf', source: 'unpaywall' } }),
    )

    expect(await findOpenAccessPdf({ pubmedId: '34512303', doi: '10.3389/fnagi.2021.686506' })).toBeNull()
  })
})
