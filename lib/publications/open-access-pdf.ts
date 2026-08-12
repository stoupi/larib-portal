import { bareDoi } from './doi'
import { barePubmedId } from './pubmed-id'

export type OpenAccessSource = 'europepmc' | 'unpaywall'
export type OpenAccessPdf = { url: string; source: OpenAccessSource }

const ID_CONVERTER = 'https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/'
const EUROPE_PMC_ARTICLES = 'https://europepmc.org/articles/'
const UNPAYWALL = 'https://api.unpaywall.org/v2'
const TOOL_NAME = 'larib-portal'
const PMCID_PATTERN = /^PMC\d+$/
const DOI_PATTERN = /^10\.\d{4,9}\/[^\s?#]+$/
const PDF_MAGIC = '%PDF'

export function idConverterUrl(pubmedId: string | null, contactEmail: string | null): string | null {
  const identifier = barePubmedId(pubmedId)
  if (!identifier) return null
  const email = contactEmail ? `&email=${encodeURIComponent(contactEmail)}` : ''
  return `${ID_CONVERTER}?ids=${identifier}&format=json&tool=${TOOL_NAME}${email}`
}

export function europePmcPdfUrl(pmcid: string | null): string | null {
  if (!pmcid) return null
  const identifier = pmcid.trim().toUpperCase()
  if (!PMCID_PATTERN.test(identifier)) return null
  return `${EUROPE_PMC_ARTICLES}${identifier}?pdf=render`
}

export function unpaywallUrl(doi: string | null, contactEmail: string | null): string | null {
  const identifier = bareDoi(doi)
  if (!identifier || !contactEmail) return null
  if (!DOI_PATTERN.test(identifier)) return null
  return `${UNPAYWALL}/${identifier}?email=${encodeURIComponent(contactEmail)}`
}

type ConverterPayload = { records?: unknown[] }
type ConverterRecord = { pmcid?: unknown }

export function readPmcId(payload: unknown): string | null {
  const records = (payload as ConverterPayload | null)?.records
  if (!Array.isArray(records)) return null
  for (const record of records) {
    const pmcid = (record as ConverterRecord | null)?.pmcid
    if (typeof pmcid === 'string' && PMCID_PATTERN.test(pmcid)) return pmcid
  }
  return null
}

const LOOPBACK_HOSTS = ['localhost', '0.0.0.0', '[::1]', '::1']
const PRIVATE_HOST_PREFIXES = ['127.', '10.', '192.168.', '169.254.']
const PRIVATE_CLASS_B_PATTERN = /^172\.(1[6-9]|2\d|3[01])\./
const INTERNAL_HOST_SUFFIXES = ['.internal', '.local']

export function isPublicHttpUrl(candidate: string | null | undefined): candidate is string {
  if (typeof candidate !== 'string') return false
  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
  const host = parsed.hostname.toLowerCase()
  if (host.length === 0) return false
  if (LOOPBACK_HOSTS.includes(host)) return false
  if (PRIVATE_HOST_PREFIXES.some((prefix) => host.startsWith(prefix))) return false
  if (PRIVATE_CLASS_B_PATTERN.test(host)) return false
  return !INTERNAL_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

type UnpaywallLocation = { url_for_pdf?: string | null }
type UnpaywallPayload = { best_oa_location?: UnpaywallLocation | null; oa_locations?: UnpaywallLocation[] | null }

export function readUnpaywallPdfUrl(payload: unknown): string | null {
  const body = payload as UnpaywallPayload | null
  const best = body?.best_oa_location?.url_for_pdf
  if (isPublicHttpUrl(best)) return best
  const locations = Array.isArray(body?.oa_locations) ? body.oa_locations : []
  for (const location of locations) {
    const fallback = location?.url_for_pdf
    if (isPublicHttpUrl(fallback)) return fallback
  }
  return null
}

const DOCUMENT_CONTENT_TYPES = ['text/', 'application/json', 'application/xml']

export function looksLikePdf(contentType: string | null, head: Uint8Array): boolean {
  if (head.length < PDF_MAGIC.length) return false
  const magic = new TextDecoder().decode(head.subarray(0, PDF_MAGIC.length))
  if (magic !== PDF_MAGIC) return false
  const type = (contentType ?? '').toLowerCase().trim()
  return !DOCUMENT_CONTENT_TYPES.some((documentType) => type.startsWith(documentType))
}
