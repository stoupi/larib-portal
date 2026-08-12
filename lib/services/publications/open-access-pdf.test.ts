import { describe, it, expect, vi, afterEach } from 'vitest'
import { findOpenAccessPdf } from './open-access-pdf'

const readFileMock = vi.hoisted(() => vi.fn<(path: string, encoding: string) => Promise<string>>())

vi.mock('node:fs/promises', () => ({ readFile: readFileMock }))

const CONTACT_EMAIL = 'contact@larib.test'
const ENCODED_CONTACT_EMAIL = 'contact%40larib.test'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

function stubNetworkEnvironment(): void {
  vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', CONTACT_EMAIL)
  vi.stubEnv('OPEN_ACCESS_FIXTURE_DIR', '')
}

function silenceErrorLog() {
  return vi.spyOn(console, 'error').mockImplementation(() => {})
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  readFileMock.mockReset()
})

describe('findOpenAccessPdf', () => {
  it('returns the Europe PMC url when the pmid is deposited in PMC', async () => {
    stubNetworkEnvironment()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ records: [{ pmcid: 'PMC8425557' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const found = await findOpenAccessPdf({ pubmedId: '34512303', doi: '10.3389/fnagi.2021.686506' })

    expect(found).toEqual({ url: 'https://europepmc.org/articles/PMC8425557?pdf=render', source: 'europepmc' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      `https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/?ids=34512303&format=json&tool=larib-portal&email=${ENCODED_CONTACT_EMAIL}`,
      expect.anything(),
    )
  })

  it('falls back to Unpaywall when the article is not in PMC', async () => {
    stubNetworkEnvironment()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ records: [{ status: 'error', errmsg: 'Identifier not found in PMC' }] }))
      .mockResolvedValueOnce(jsonResponse({ is_oa: true, best_oa_location: { url_for_pdf: 'https://example.test/a.pdf' } }))
    vi.stubGlobal('fetch', fetchMock)

    const found = await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })

    expect(found).toEqual({ url: 'https://example.test/a.pdf', source: 'unpaywall' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenLastCalledWith(
      `https://api.unpaywall.org/v2/10.1093/ehjci/jeab087?email=${ENCODED_CONTACT_EMAIL}`,
      expect.anything(),
    )
  })

  it('queries Unpaywall alone when the article has a doi but no pmid', async () => {
    stubNetworkEnvironment()
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ best_oa_location: { url_for_pdf: 'https://example.test/doi-only.pdf' } }))
    vi.stubGlobal('fetch', fetchMock)

    const found = await findOpenAccessPdf({ pubmedId: null, doi: '10.1093/ehjci/jeab087' })

    expect(found).toEqual({ url: 'https://example.test/doi-only.pdf', source: 'unpaywall' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.unpaywall.org/v2/10.1093/ehjci/jeab087?email=${ENCODED_CONTACT_EMAIL}`,
      expect.anything(),
    )
  })

  it('returns null when neither source has a pdf', async () => {
    stubNetworkEnvironment()
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
    stubNetworkEnvironment()
    const errorLog = silenceErrorLog()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce(jsonResponse({ best_oa_location: { url_for_pdf: 'https://example.test/a.pdf' } })),
    )

    const found = await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })

    expect(found?.source).toBe('unpaywall')
    expect(errorLog).toHaveBeenCalledTimes(1)
  })

  it('skips Unpaywall when no contact email is configured', async () => {
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', '')
    vi.stubEnv('OPEN_ACCESS_FIXTURE_DIR', '')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ records: [{ status: 'error' }] }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns null without querying anything when both identifiers are missing', async () => {
    stubNetworkEnvironment()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await findOpenAccessPdf({ pubmedId: null, doi: null })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats a non-ok response as an unavailable source and logs it without the contact email', async () => {
    stubNetworkEnvironment()
    const errorLog = silenceErrorLog()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 503 })))

    expect(await findOpenAccessPdf({ pubmedId: '27141953', doi: '10.1093/ehjci/jeab087' })).toBeNull()

    const loggedLines = errorLog.mock.calls.map((call) => call.join(' '))
    expect(loggedLines).toHaveLength(2)
    expect(loggedLines[0]).toContain('503')
    expect(loggedLines[0]).toContain('pmc.ncbi.nlm.nih.gov')
    expect(loggedLines[1]).toContain('api.unpaywall.org')
    expect(loggedLines.join(' ')).not.toContain(CONTACT_EMAIL)
    expect(loggedLines.join(' ')).not.toContain(ENCODED_CONTACT_EMAIL)
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

  it('resolves a fixture entry keyed by doi when the article has no pmid', async () => {
    vi.stubEnv('OPEN_ACCESS_FIXTURE_DIR', '/fixtures/open-access')
    vi.stubEnv('OPEN_ACCESS_FIXTURE_ORIGIN', 'http://localhost:3100')
    readFileMock.mockResolvedValue(
      JSON.stringify({
        '10.1093/ehjci/jeab087': { url: '{origin}/test-open-access-sample.pdf', source: 'unpaywall' },
      }),
    )

    const found = await findOpenAccessPdf({ pubmedId: null, doi: '10.1093/ehjci/jeab087' })

    expect(found).toEqual({ url: 'http://localhost:3100/test-open-access-sample.pdf', source: 'unpaywall' })
  })

  it('returns null when the fixture has no entry for either identifier', async () => {
    vi.stubEnv('OPEN_ACCESS_FIXTURE_DIR', '/fixtures/open-access')
    readFileMock.mockResolvedValue(
      JSON.stringify({ '99999999': { url: 'https://example.test/other.pdf', source: 'unpaywall' } }),
    )

    expect(await findOpenAccessPdf({ pubmedId: '34512303', doi: '10.3389/fnagi.2021.686506' })).toBeNull()
  })

  it('returns null instead of throwing when the fixture file cannot be read', async () => {
    vi.stubEnv('OPEN_ACCESS_FIXTURE_DIR', '/fixtures/open-access')
    const errorLog = silenceErrorLog()
    readFileMock.mockRejectedValue(new Error('ENOENT: no such file or directory'))

    await expect(findOpenAccessPdf({ pubmedId: '34512303', doi: null })).resolves.toBeNull()
    expect(errorLog).toHaveBeenCalledTimes(1)
  })

  it('ignores the fixture directory in production and queries the real sources', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('OPEN_ACCESS_CONTACT_EMAIL', CONTACT_EMAIL)
    vi.stubEnv('OPEN_ACCESS_FIXTURE_DIR', '/fixtures/open-access')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ records: [{ pmcid: 'PMC8425557' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const found = await findOpenAccessPdf({ pubmedId: '34512303', doi: null })

    expect(found).toEqual({ url: 'https://europepmc.org/articles/PMC8425557?pdf=render', source: 'europepmc' })
    expect(readFileMock).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
