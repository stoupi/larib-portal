import { prisma } from '@/lib/prisma'
import type { PubmedRecord, ImportReport } from '@/types/publications'
import { authorDedupeKey, pickAuthorMatch } from './import-dedupe'
import { upsertAffiliationWithCentre } from './affiliations'
import { loadCentreIndex } from './centre-resolve'
import { reviewDelayDays } from './pubmed-parse'
import { classifyArticleType } from '@/lib/publications/article-type'
import type { ArticleScopeValue } from '@/lib/publications/article-scope'
import { resolveImportScope } from './import-scope'

export const PUBLICATIONS_JOURNALS_TAG = 'publications:journals'
export const PUBLICATIONS_AUTHORS_TAG = 'publications:authors'
export const PUBLICATIONS_ARTICLES_TAG = 'publications:articles'

async function upsertJournal(record: PubmedRecord, report: ImportReport): Promise<string | null> {
  const { name, issn, isoAbbrev } = record.journal
  const journalName = name || isoAbbrev
  if (!journalName) return null
  const existing = await prisma.journal.findFirst({
    where: { OR: [...(issn ? [{ issn }] : []), { name: journalName }] },
    select: { id: true, abbreviation: true },
  })
  if (existing) {
    if (!existing.abbreviation && isoAbbrev) {
      await prisma.journal.update({ where: { id: existing.id }, data: { abbreviation: isoAbbrev } })
    }
    return existing.id
  }
  const created = await prisma.journal.create({
    data: { name: journalName, issn: issn ?? null, abbreviation: isoAbbrev ?? null },
    select: { id: true },
  })
  report.journalsCreated += 1
  return created.id
}

async function upsertAuthor(
  author: PubmedRecord['authors'][number],
  cache: Map<string, string>,
  report: ImportReport,
): Promise<string> {
  const key = authorDedupeKey(author)
  const cached = cache.get(key)
  if (cached) return cached

  const plainLastName = author.lastName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const candidates = await prisma.author.findMany({
    where: {
      OR: [
        ...(author.orcid ? [{ orcid: author.orcid }] : []),
        { lastName: { equals: author.lastName, mode: 'insensitive' } },
        { lastName: { equals: plainLastName, mode: 'insensitive' } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, initials: true, orcid: true },
  })
  const existing = pickAuthorMatch(candidates, author)
  if (existing) {
    // The record can carry details the stored author still lacks.
    const enrichment = {
      ...(author.orcid && !existing.orcid ? { orcid: author.orcid } : {}),
      ...(author.initials && !existing.initials ? { initials: author.initials } : {}),
    }
    if (Object.keys(enrichment).length > 0) {
      await prisma.author.update({ where: { id: existing.id }, data: enrichment })
    }
    cache.set(key, existing.id)
    return existing.id
  }
  const created = await prisma.author.create({
    data: {
      firstName: author.foreName ?? author.initials ?? '',
      lastName: author.lastName,
      initials: author.initials ?? null,
      orcid: author.orcid ?? null,
      // A name off a PubMed record says nothing about team membership; that is
      // decided later by attaching one of our centres.
      type: 'EXTERNAL',
    },
    select: { id: true },
  })
  report.authorsCreated += 1
  cache.set(key, created.id)
  return created.id
}

export async function importRecords(
  records: PubmedRecord[],
  createdById: string,
  scopeByPmid: Map<string, ArticleScopeValue> = new Map(),
): Promise<ImportReport> {
  const report: ImportReport = { articlesCreated: 0, articlesSkipped: 0, authorsCreated: 0, journalsCreated: 0, errors: [] }
  const authorCache = new Map<string, string>()
  const centreIndex = await loadCentreIndex(prisma)

  for (const record of records) {
    try {
      const existingArticle = await prisma.article.findFirst({ where: { pubmedId: record.pmid }, select: { id: true } })
      if (existingArticle) {
        report.articlesSkipped += 1
        continue
      }
      const publishedJournalId = await upsertJournal(record, report)
      const affReport = { affiliationsCreated: 0, centresCreated: 0 }
      const authorships: Array<{ authorId: string; order: number; affiliations: { create: Array<{ affiliationId: string; order: number }> } }> = []
      const seenAuthorIds = new Set<string>()
      for (const author of record.authors) {
        const authorId = await upsertAuthor(author, authorCache, report)
        if (seenAuthorIds.has(authorId)) continue // same person listed twice / homonym in one paper
        seenAuthorIds.add(authorId)
        const affiliationCreate: Array<{ affiliationId: string; order: number }> = []
        if (author.affiliation) {
          const affiliationId = await prisma.$transaction((tx) => upsertAffiliationWithCentre(tx, author.affiliation as string, affReport, centreIndex))
          if (affiliationId) affiliationCreate.push({ affiliationId, order: 1 })
        }
        authorships.push({ authorId, order: authorships.length + 1, affiliations: { create: affiliationCreate } })
      }
      await prisma.article.create({
        data: {
          title: record.title || '(untitled)',
          type: classifyArticleType(record.publicationTypes),
          status: 'PUBLISHED',
          abstract: record.abstract,
          pubmedId: record.pmid,
          doi: record.doi,
          publishedAt: record.publishedAt ? new Date(record.publishedAt) : null,
          receivedAt: record.receivedAt ? new Date(record.receivedAt) : null,
          acceptedAt: record.acceptedAt ? new Date(record.acceptedAt) : null,
          reviewDelayDays: reviewDelayDays(record.receivedAt, record.acceptedAt),
          publishedJournalId,
          createdById,
          scope: resolveImportScope(scopeByPmid, record.pmid),
          authorships: {
            create: authorships,
          },
        },
        select: { id: true },
      })
      report.articlesCreated += 1
    } catch (error) {
      report.errors.push({ pmid: record.pmid, message: error instanceof Error ? error.message : 'UNKNOWN' })
    }
  }
  return report
}
