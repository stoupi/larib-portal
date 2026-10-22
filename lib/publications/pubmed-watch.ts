import { bareDoi } from './doi'
import { normalizeTitle, titleSimilarity } from './import-candidates'
import { normalizeJournalName } from './mail-agent'

export const MIRACL_AFFILIATION_QUERY = '"MIRACL.ai"[Affiliation]'
export const PUBMED_WATCH_RETMAX = 1000

const SIMILAR_TITLE_THRESHOLD = 0.82

export const PUBMED_ALERT_REVIEW_REASONS = ['SIMILAR_TITLE', 'AMBIGUOUS_TITLE', 'PMID_CONFLICT', 'UNKNOWN_ARTICLE'] as const
export type PubmedAlertReviewReason = (typeof PUBMED_ALERT_REVIEW_REASONS)[number]

export type WatchedPaper = {
  pmid: string
  title: string
  doi: string | null
  journalNames: string[]
}

export type WatchLibraryArticle = {
  id: string
  title: string
  doi: string | null
  pubmedId: string | null
  journalNames: string[]
}

export type WatchPlan =
  | { kind: 'KNOWN' }
  | { kind: 'AUTO_LINK'; articleId: string }
  | { kind: 'REVIEW'; reason: PubmedAlertReviewReason; articleId: string | null }

// PubMed names a journal "Journal of cardiovascular magnetic resonance : official journal
// of the Society..." where the bank keeps "Journal of Cardiovascular Magnetic Resonance".
export function journalKey(name: string): string {
  return normalizeJournalName(name.split(' : ')[0])
}

function sameJournal(paper: WatchedPaper, article: WatchLibraryArticle): boolean {
  const paperKeys = new Set(paper.journalNames.map(journalKey).filter((key) => key.length > 0))
  return article.journalNames.some((name) => paperKeys.has(journalKey(name)))
}

function sameDoi(first: string | null, second: string | null): boolean {
  const firstDoi = bareDoi(first)?.toLowerCase()
  return firstDoi != null && firstDoi === bareDoi(second)?.toLowerCase()
}

export function planWatchedPaper(paper: WatchedPaper, library: WatchLibraryArticle[]): WatchPlan {
  if (library.some((article) => article.pubmedId === paper.pmid)) return { kind: 'KNOWN' }

  const byDoi = library.find((article) => sameDoi(article.doi, paper.doi))
  if (byDoi) {
    return byDoi.pubmedId == null
      ? { kind: 'AUTO_LINK', articleId: byDoi.id }
      : { kind: 'REVIEW', reason: 'PMID_CONFLICT', articleId: byDoi.id }
  }

  const unlinked = library.filter((article) => article.pubmedId == null)
  const titleKey = normalizeTitle(paper.title)
  const sameTitle = titleKey.length > 0 ? unlinked.filter((article) => normalizeTitle(article.title) === titleKey) : []
  if (sameTitle.length === 1) return { kind: 'AUTO_LINK', articleId: sameTitle[0].id }
  if (sameTitle.length > 1) return { kind: 'REVIEW', reason: 'AMBIGUOUS_TITLE', articleId: null }

  const lookalike = unlinked
    .map((article) => ({ article, score: titleSimilarity(paper.title, article.title) }))
    .filter((scored) => scored.score >= SIMILAR_TITLE_THRESHOLD)
    .sort((first, second) => second.score - first.score)[0]
  if (lookalike) {
    // Titles drift between acceptance and print ("Threshold" became "Cutoff"); the journal
    // the article was accepted in is what tells a reworded title from another paper.
    return sameJournal(paper, lookalike.article)
      ? { kind: 'AUTO_LINK', articleId: lookalike.article.id }
      : { kind: 'REVIEW', reason: 'SIMILAR_TITLE', articleId: lookalike.article.id }
  }

  return { kind: 'REVIEW', reason: 'UNKNOWN_ARTICLE', articleId: null }
}

// Two papers of one run can point at the same article (a paper and its correction share a
// title): only the first is linked, the next waits for an admin.
export function planWatchedPapers(
  papers: WatchedPaper[],
  library: WatchLibraryArticle[],
): Array<{ paper: WatchedPaper; plan: WatchPlan }> {
  const claimed = new Set<string>()
  return papers.map((paper) => {
    const plan = planWatchedPaper(paper, library)
    if (plan.kind !== 'AUTO_LINK') return { paper, plan }
    if (claimed.has(plan.articleId)) {
      return { paper, plan: { kind: 'REVIEW', reason: 'AMBIGUOUS_TITLE', articleId: plan.articleId } }
    }
    claimed.add(plan.articleId)
    return { paper, plan }
  })
}

export type JournalCandidate = { id: string; name: string; abbreviation: string | null; issn?: string | null }
export type RecordJournal = { name: string; isoAbbrev: string | null; issn: string | null }

function candidateKeys(journal: JournalCandidate): string[] {
  return [journal.name, journal.abbreviation ?? ''].map(journalKey).filter((key) => key.length > 0)
}

// The journal the article was accepted in comes first, so a link never forks one journal
// into the bank's spelling and PubMed's.
export function findJournalForRecord(
  journal: RecordJournal,
  preferred: JournalCandidate[],
  bank: JournalCandidate[],
): JournalCandidate | null {
  const recordKeys = new Set([journal.name, journal.isoAbbrev ?? ''].map(journalKey).filter((key) => key.length > 0))
  const matches = (candidate: JournalCandidate) =>
    (journal.issn != null && candidate.issn === journal.issn) || candidateKeys(candidate).some((key) => recordKeys.has(key))
  return preferred.find(matches) ?? bank.find(matches) ?? null
}
