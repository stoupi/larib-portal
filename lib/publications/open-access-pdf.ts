import { bareDoi } from './doi'
import { barePubmedId } from './pubmed-id'

export type OpenAccessSource = 'europepmc' | 'unpaywall'
export type OpenAccessPdf = { url: string; source: OpenAccessSource }

const ID_CONVERTER = 'https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/'
const UNPAYWALL = 'https://api.unpaywall.org/v2'
const TOOL_NAME = 'larib-portal'
const PMCID_PATTERN = /^PMC\d+$/
const PDF_MAGIC = '%PDF'

export function idConverterUrl(pubmedId: string | null, contactEmail: string | null): string | null {
  const identifier = barePubmedId(pubmedId)
  if (!identifier) return null
  const email = contactEmail ? `&email=${encodeURIComponent(contactEmail)}` : ''
  return `${ID_CONVERTER}?ids=${identifier}&format=json&tool=${TOOL_NAME}${email}`
}

export function europePmcPdfUrl(pmcid: string): string | null {
  const identifier = pmcid.trim().toUpperCase()
  if (!PMCID_PATTERN.test(identifier)) return null
  return `https://europepmc.org/articles/${identifier}?pdf=render`
}

export function unpaywallUrl(doi: string | null, contactEmail: string | null): string | null {
  const identifier = bareDoi(doi)
  if (!identifier || !contactEmail) return null
  return `${UNPAYWALL}/${identifier}?email=${encodeURIComponent(contactEmail)}`
}

type ConverterPayload = { records?: { pmcid?: string; status?: string }[] }

export function readPmcId(payload: unknown): string | null {
  const records = (payload as ConverterPayload | null)?.records
  if (!Array.isArray(records)) return null
  const found = records.find((record) => typeof record?.pmcid === 'string' && PMCID_PATTERN.test(record.pmcid))
  return found?.pmcid ?? null
}

type UnpaywallLocation = { url_for_pdf?: string | null }
type UnpaywallPayload = { best_oa_location?: UnpaywallLocation | null; oa_locations?: UnpaywallLocation[] | null }

function httpPdfUrl(candidate: string | null | undefined): string | null {
  if (typeof candidate !== 'string') return null
  return /^https?:\/\//i.test(candidate) ? candidate : null
}

export function readUnpaywallPdfUrl(payload: unknown): string | null {
  const body = payload as UnpaywallPayload | null
  const best = httpPdfUrl(body?.best_oa_location?.url_for_pdf)
  if (best) return best
  const locations = Array.isArray(body?.oa_locations) ? body.oa_locations : []
  for (const location of locations) {
    const fallback = httpPdfUrl(location?.url_for_pdf)
    if (fallback) return fallback
  }
  return null
}

export function looksLikePdf(contentType: string | null, head: Uint8Array): boolean {
  if (head.length < PDF_MAGIC.length) return false
  const magic = new TextDecoder().decode(head.subarray(0, PDF_MAGIC.length))
  if (magic !== PDF_MAGIC) return false
  const type = (contentType ?? '').toLowerCase()
  return type.length === 0 || type.includes('pdf') || type.includes('octet-stream')
}
