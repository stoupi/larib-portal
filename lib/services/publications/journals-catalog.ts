import 'server-only'

export type JournalCandidate = { title: string; issn: string | null; publisher: string | null }

const FIXTURE_DIR = process.env.PUBMED_FIXTURE_DIR

export async function searchCrossref(query: string): Promise<JournalCandidate[]> {
  if (FIXTURE_DIR) {
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    return JSON.parse(await readFile(join(FIXTURE_DIR, 'crossref-journals.json'), 'utf8')) as JournalCandidate[]
  }
  const url = new URL('https://api.crossref.org/journals')
  url.searchParams.set('query', query)
  url.searchParams.set('rows', '20')
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LaribPortal/1.0 (mailto:publications@larib.fr)' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('CROSSREF_FAILED')
  const json = (await res.json()) as {
    message?: { items?: Array<{ title?: string | string[]; ISSN?: string[]; publisher?: string }> }
  }
  return (json.message?.items ?? []).map((item) => ({
    title: Array.isArray(item.title) ? item.title[0] ?? '' : item.title ?? '',
    issn: item.ISSN?.[0] ?? null,
    publisher: item.publisher ?? null,
  }))
}

export type JournalLookupResult = {
  title: string
  issn: string
  publisher: string | null
  sjr: number | null
}

// Crossref exposes one journal per ISSN; SJR is not part of that payload and is read
// from the local Scimago dataset when the admin has provided one.
export async function lookupJournalByIssn(issn: string): Promise<JournalLookupResult | null> {
  const { normalizeIssn } = await import('./sjr')
  const normalized = normalizeIssn(issn)
  if (normalized.length !== 8) return null

  if (FIXTURE_DIR) {
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const candidates = JSON.parse(await readFile(join(FIXTURE_DIR, 'crossref-journals.json'), 'utf8')) as JournalCandidate[]
    const match = candidates.find((candidate) => candidate.issn && normalizeIssn(candidate.issn) === normalized)
    if (!match) return null
    return { title: match.title, issn: match.issn ?? issn, publisher: match.publisher, sjr: await sjrForIssn(normalized) }
  }

  const res = await fetch(`https://api.crossref.org/journals/${encodeURIComponent(issn.trim())}`, {
    headers: { 'User-Agent': 'LaribPortal/1.0 (mailto:publications@larib.fr)' },
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('CROSSREF_FAILED')
  const json = (await res.json()) as { message?: { title?: string; ISSN?: string[]; publisher?: string } }
  const message = json.message
  if (!message?.title) return null
  return {
    title: message.title,
    issn: message.ISSN?.[0] ?? issn.trim(),
    publisher: message.publisher ?? null,
    sjr: await sjrForIssn(normalized),
  }
}

async function sjrForIssn(normalizedIssn: string): Promise<number | null> {
  const { readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const { parseSjrCsv } = await import('./sjr')
  try {
    const text = await readFile(join(process.cwd(), 'data', 'scimago.csv'), 'utf8')
    return parseSjrCsv(text).get(normalizedIssn) ?? null
  } catch {
    return null
  }
}
