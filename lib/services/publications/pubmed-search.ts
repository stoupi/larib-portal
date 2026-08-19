import 'server-only'
import { prisma } from '@/lib/prisma'
import type { PubmedRecord } from '@/types/publications'
import { searchPubmed, fetchByPmids } from './pubmed'
import { normalizeName, authorFirstInitial } from './import-dedupe'
import { findKnownPublications, listPublicationTitles } from './articles'
import { matchCandidates, type ImportCandidate } from '@/lib/publications/import-candidates'
import { proposeArticleScope, type ArticleScopeValue } from '@/lib/publications/article-scope'
import { authorIsViewer, type ViewerIdentity } from '@/lib/publications/pubmed-import'

export type PreviewAuthor = { name: string; team: boolean; isViewer: boolean }

export type PubmedRecordPreview = {
  pmid: string
  title: string
  journalName: string | null
  year: number | null
  doi: string | null
  abstract: string | null
  publishedAt: string | null
  authors: PreviewAuthor[]
  viewerIsAuthor: boolean
  proposedScope: ArticleScopeValue
  existingArticleId: string | null
}

// One place decides what "already in the library" and "look-alike" mean, so the admin
// module and the member dialog always agree.
export async function searchPubmedWithLibraryMatches(query: string, retmax: number): Promise<ImportCandidate[]> {
  const candidates = await searchPubmed(query, retmax)
  const [known, library] = await Promise.all([
    findKnownPublications(candidates.map(({ pmid, doi }) => ({ pmid, doi }))),
    listPublicationTitles(),
  ])
  return matchCandidates(candidates, known, library)
}

async function findExistingArticleId(pmid: string, doi: string | null): Promise<string | null> {
  const existing = await prisma.article.findFirst({
    where: { OR: [{ pubmedId: pmid }, ...(doi ? [{ doi: { equals: doi, mode: 'insensitive' as const } }] : [])] },
    select: { id: true },
  })
  return existing?.id ?? null
}

export async function loadRecordWithPreview(
  pmid: string,
  viewer: ViewerIdentity | null,
): Promise<{ record: PubmedRecord; preview: PubmedRecordPreview } | null> {
  const [record] = await fetchByPmids([pmid])
  if (!record) return null

  const teamAuthors = await prisma.author.findMany({
    where: { type: 'OUR_TEAM' },
    select: { firstName: true, lastName: true, initials: true },
  })

  const authors: PreviewAuthor[] = record.authors.map((author) => ({
    name: `${author.foreName ?? author.initials ?? ''} ${author.lastName}`.trim(),
    team: teamAuthors.some(
      (teamAuthor) =>
        normalizeName(teamAuthor.lastName) === normalizeName(author.lastName) &&
        authorFirstInitial(teamAuthor) === authorFirstInitial(author),
    ),
    isViewer: viewer ? authorIsViewer(author, viewer) : false,
  }))

  return {
    record,
    preview: {
      pmid: record.pmid,
      title: record.title,
      journalName: record.journal.name || record.journal.isoAbbrev,
      year: record.publishedAt ? new Date(record.publishedAt).getUTCFullYear() : null,
      doi: record.doi,
      abstract: record.abstract,
      publishedAt: record.publishedAt,
      authors,
      viewerIsAuthor: authors.some((author) => author.isViewer),
      proposedScope: proposeArticleScope(authors),
      existingArticleId: await findExistingArticleId(record.pmid, record.doi),
    },
  }
}

export async function buildRecordPreview(pmid: string, viewer: ViewerIdentity | null): Promise<PubmedRecordPreview | null> {
  const loaded = await loadRecordWithPreview(pmid, viewer)
  return loaded?.preview ?? null
}
