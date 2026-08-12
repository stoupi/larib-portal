import {
  idConverterUrl,
  europePmcPdfUrl,
  readPmcId,
  readUnpaywallPdfUrl,
  unpaywallUrl,
  type OpenAccessPdf,
  type OpenAccessSource,
} from '@/lib/publications/open-access-pdf'

const REQUEST_TIMEOUT_MS = 10_000
const FIXTURE_ORIGIN_MARKER = '{origin}'

function contactEmail(): string | null {
  const configured = process.env.OPEN_ACCESS_CONTACT_EMAIL?.trim()
  return configured && configured.length > 0 ? configured : null
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// The lookup urls carry our contact email as a query parameter, so logs keep the host only.
function lookupHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return 'unknown host'
  }
}

async function fetchJson(url: string, source: OpenAccessSource): Promise<unknown> {
  const host = lookupHost(url)
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    if (!response.ok) {
      console.error(`[open-access] ${source} lookup on ${host} answered ${response.status}`)
      return null
    }
    return await response.json()
  } catch (error) {
    console.error(`[open-access] ${source} lookup on ${host} failed:`, reason(error))
    return null
  }
}

async function fromPubmedCentral(pubmedId: string | null): Promise<OpenAccessPdf | null> {
  const lookup = idConverterUrl(pubmedId, contactEmail())
  if (!lookup) return null
  const pmcid = readPmcId(await fetchJson(lookup, 'europepmc'))
  if (!pmcid) return null
  const url = europePmcPdfUrl(pmcid)
  return url ? { url, source: 'europepmc' } : null
}

async function fromUnpaywall(doi: string | null): Promise<OpenAccessPdf | null> {
  const lookup = unpaywallUrl(doi, contactEmail())
  if (!lookup) return null
  const url = readUnpaywallPdfUrl(await fetchJson(lookup, 'unpaywall'))
  return url ? { url, source: 'unpaywall' } : null
}

async function readFixture(
  fixtureDir: string,
  pubmedId: string | null,
  doi: string | null,
): Promise<OpenAccessPdf | null> {
  const { readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const raw = await readFile(join(fixtureDir, 'resolutions.json'), 'utf8')
  const resolutions = JSON.parse(raw) as Record<string, OpenAccessPdf | undefined>
  const keys = [pubmedId, doi].filter((key): key is string => typeof key === 'string' && key.length > 0)
  for (const key of keys) {
    const resolution = resolutions[key]
    if (resolution) {
      const origin = process.env.OPEN_ACCESS_FIXTURE_ORIGIN ?? ''
      return { ...resolution, url: resolution.url.replace(FIXTURE_ORIGIN_MARKER, origin) }
    }
  }
  return null
}

export async function findOpenAccessPdf({
  pubmedId,
  doi,
}: {
  pubmedId: string | null
  doi: string | null
}): Promise<OpenAccessPdf | null> {
  if (!pubmedId && !doi) return null
  const fixtureDir = process.env.OPEN_ACCESS_FIXTURE_DIR
  if (process.env.NODE_ENV !== 'production' && fixtureDir) {
    try {
      return await readFixture(fixtureDir, pubmedId, doi)
    } catch (error) {
      console.error(`[open-access] fixture lookup in ${fixtureDir} failed:`, reason(error))
      return null
    }
  }
  return (await fromPubmedCentral(pubmedId)) ?? (await fromUnpaywall(doi))
}
