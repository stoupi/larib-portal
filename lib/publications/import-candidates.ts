import type { PubmedCandidate } from '@/types/publications'

export type CandidateMatch = 'new' | 'known' | 'similar'

export type ImportCandidate = PubmedCandidate & {
  match: CandidateMatch
  matchedTitle: string | null
}

export type KnownPublications = { pmids: string[]; dois: string[] }

export type LibraryPublication = { title: string; year: number | null }

const SIMILARITY_THRESHOLD = 0.82
const MIN_TOKENS_FOR_OVERLAP = 3
const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'for', 'and', 'with', 'to', 'by', 'from'])

export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function titleTokens(title: string): Set<string> {
  return new Set(
    normalizeTitle(title)
      .split(' ')
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
  )
}

// Dice coefficient over meaningful words: robust to punctuation, casing and a couple of edits.
export function titleSimilarity(first: string, second: string): number {
  const normalizedFirst = normalizeTitle(first)
  const normalizedSecond = normalizeTitle(second)
  if (normalizedFirst.length === 0 || normalizedSecond.length === 0) return 0
  if (normalizedFirst === normalizedSecond) return 1

  const firstTokens = titleTokens(first)
  const secondTokens = titleTokens(second)
  // Below a few meaningful words the overlap says nothing, so only an exact match counts.
  if (firstTokens.size < MIN_TOKENS_FOR_OVERLAP || secondTokens.size < MIN_TOKENS_FOR_OVERLAP) return 0
  let shared = 0
  for (const token of firstTokens) if (secondTokens.has(token)) shared += 1
  return (2 * shared) / (firstTokens.size + secondTokens.size)
}

function yearsAreCompatible(candidateYear: number | null, libraryYear: number | null): boolean {
  if (candidateYear == null || libraryYear == null) return true
  return Math.abs(candidateYear - libraryYear) <= 1
}

export function findLookalike(
  candidate: PubmedCandidate,
  library: LibraryPublication[],
): LibraryPublication | null {
  let best: { publication: LibraryPublication; score: number } | null = null
  for (const publication of library) {
    if (!yearsAreCompatible(candidate.year, publication.year)) continue
    const score = titleSimilarity(candidate.title, publication.title)
    if (score >= SIMILARITY_THRESHOLD && (best == null || score > best.score)) {
      best = { publication, score }
    }
  }
  return best?.publication ?? null
}

export function matchCandidates(
  candidates: PubmedCandidate[],
  known: KnownPublications,
  library: LibraryPublication[] = [],
): ImportCandidate[] {
  const knownPmids = new Set(known.pmids)
  const knownDois = new Set(known.dois.map((doi) => doi.toLowerCase()))

  return candidates.map((candidate) => {
    const isKnown = knownPmids.has(candidate.pmid) || (candidate.doi != null && knownDois.has(candidate.doi.toLowerCase()))
    if (isKnown) return { ...candidate, match: 'known', matchedTitle: null }
    const lookalike = findLookalike(candidate, library)
    if (lookalike) return { ...candidate, match: 'similar', matchedTitle: lookalike.title }
    return { ...candidate, match: 'new', matchedTitle: null }
  })
}

export function newCandidatePmids(candidates: ImportCandidate[]): string[] {
  return candidates.filter((candidate) => candidate.match === 'new').map((candidate) => candidate.pmid)
}
