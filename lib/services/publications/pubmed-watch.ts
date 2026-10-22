import { prisma } from '@/lib/prisma'
import type { PubmedRecord } from '@/types/publications'
import {
  MIRACL_AFFILIATION_QUERY,
  PUBMED_WATCH_RETMAX,
  findJournalForRecord,
  planWatchedPapers,
  type PubmedAlertReviewReason,
  type WatchLibraryArticle,
  type WatchPlan,
  type WatchedPaper,
} from '@/lib/publications/pubmed-watch'
import { fetchByPmids, searchPubmed } from './pubmed'
import { reviewDelayDays } from './pubmed-parse'
import { emptyReport, importRecords, upsertJournal } from './import'

export const PUBLICATIONS_PUBMED_ALERTS_TAG = 'publications:pubmed-alerts'

const SETTINGS_ID = 'singleton'

export type PubmedAlertStatus = 'PENDING' | 'LINKED' | 'AUTO_LINKED' | 'IMPORTED' | 'DISMISSED'

export type PubmedAlertRow = {
  id: string
  pmid: string
  title: string
  journalName: string | null
  doi: string | null
  publishedAt: string | null
  authorNames: string[]
  status: PubmedAlertStatus
  reviewReason: PubmedAlertReviewReason | null
  article: { id: string; title: string } | null
  createdAt: string
  resolvedAt: string | null
}

export type PubmedWatchReport = { found: number; autoLinked: PubmedAlertRow[]; pending: PubmedAlertRow[] }

const ROW_SELECT = {
  id: true,
  pmid: true,
  title: true,
  journalName: true,
  doi: true,
  publishedAt: true,
  authorNames: true,
  status: true,
  reviewReason: true,
  createdAt: true,
  resolvedAt: true,
  article: { select: { id: true, title: true } },
} as const

type AlertRecord = {
  id: string
  pmid: string
  title: string
  journalName: string | null
  doi: string | null
  publishedAt: Date | null
  authorNames: string[]
  status: PubmedAlertStatus
  reviewReason: PubmedAlertReviewReason | null
  createdAt: Date
  resolvedAt: Date | null
  article: { id: string; title: string } | null
}

function toRow(alert: AlertRecord): PubmedAlertRow {
  return {
    ...alert,
    publishedAt: alert.publishedAt?.toISOString() ?? null,
    createdAt: alert.createdAt.toISOString(),
    resolvedAt: alert.resolvedAt?.toISOString() ?? null,
  }
}

function authorNamesOf(record: PubmedRecord): string[] {
  return record.authors.map((author) => `${author.foreName ?? author.initials ?? ''} ${author.lastName}`.trim())
}

function watchedPaperOf(record: PubmedRecord): WatchedPaper {
  return {
    pmid: record.pmid,
    title: record.title,
    doi: record.doi,
    journalNames: [record.journal.name, record.journal.isoAbbrev ?? ''].filter((name) => name.length > 0),
  }
}

async function loadWatchLibrary(): Promise<WatchLibraryArticle[]> {
  const articles = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      doi: true,
      pubmedId: true,
      publishedJournal: { select: { name: true, abbreviation: true } },
      submissions: {
        where: { status: { not: 'REJECTED' } },
        select: { journal: { select: { name: true, abbreviation: true } } },
      },
    },
  })
  return articles.map((article) => ({
    id: article.id,
    title: article.title,
    doi: article.doi,
    pubmedId: article.pubmedId,
    journalNames: [article.publishedJournal, ...article.submissions.map((submission) => submission.journal)]
      .flatMap((journal) => (journal ? [journal.name, journal.abbreviation ?? ''] : []))
      .filter((name) => name.length > 0),
  }))
}

async function resolvePublishedJournalId(articleId: string, record: PubmedRecord): Promise<string | null> {
  const [article, bank] = await Promise.all([
    prisma.article.findUnique({
      where: { id: articleId },
      select: {
        submissions: {
          where: { status: 'ACCEPTED' },
          select: { journal: { select: { id: true, name: true, abbreviation: true, issn: true } } },
        },
      },
    }),
    prisma.journal.findMany({ select: { id: true, name: true, abbreviation: true, issn: true } }),
  ])
  const preferred = (article?.submissions ?? []).map((submission) => submission.journal)
  const known = findJournalForRecord(record.journal, preferred, bank)
  if (!known) return upsertJournal(record, emptyReport())
  const enrichment = {
    ...(!known.abbreviation && record.journal.isoAbbrev ? { abbreviation: record.journal.isoAbbrev } : {}),
    ...(!known.issn && record.journal.issn ? { issn: record.journal.issn } : {}),
  }
  if (Object.keys(enrichment).length > 0) {
    await prisma.journal.update({ where: { id: known.id }, data: enrichment }).catch(() => null)
  }
  return known.id
}

// The article keeps its own author list, which the team curated with affiliations; PubMed
// only brings what publication settles: identifiers, journal, dates and status.
export async function linkArticleToPubmedRecord(articleId: string, record: PubmedRecord): Promise<void> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { doi: true, abstract: true, receivedAt: true, acceptedAt: true, reviewDelayDays: true },
  })
  if (!article) throw new Error('ARTICLE_NOT_FOUND')
  const publishedJournalId = await resolvePublishedJournalId(articleId, record)

  await prisma.article.update({
    where: { id: articleId },
    data: {
      pubmedId: record.pmid,
      doi: article.doi ?? record.doi,
      status: 'PUBLISHED',
      publishedAt: record.publishedAt ? new Date(record.publishedAt) : undefined,
      publishedJournalId: publishedJournalId ?? undefined,
      abstract: article.abstract ?? record.abstract,
      receivedAt: article.receivedAt ?? (record.receivedAt ? new Date(record.receivedAt) : null),
      acceptedAt: article.acceptedAt ?? (record.acceptedAt ? new Date(record.acceptedAt) : null),
      reviewDelayDays: article.reviewDelayDays ?? reviewDelayDays(record.receivedAt, record.acceptedAt),
    },
  })
}

async function recordWatchedPaper(record: PubmedRecord, plan: Exclude<WatchPlan, { kind: 'KNOWN' }>): Promise<PubmedAlertRow> {
  if (plan.kind === 'AUTO_LINK') await linkArticleToPubmedRecord(plan.articleId, record)
  const alert = await prisma.publicationPubmedAlert.create({
    data: {
      pmid: record.pmid,
      title: record.title,
      journalName: record.journal.name || record.journal.isoAbbrev,
      doi: record.doi,
      publishedAt: record.publishedAt ? new Date(record.publishedAt) : null,
      authorNames: authorNamesOf(record),
      status: plan.kind === 'AUTO_LINK' ? 'AUTO_LINKED' : 'PENDING',
      reviewReason: plan.kind === 'REVIEW' ? plan.reason : null,
      articleId: plan.articleId,
      resolvedAt: plan.kind === 'AUTO_LINK' ? new Date() : null,
    },
    select: ROW_SELECT,
  })
  return toRow(alert)
}

export async function runPubmedWatch(): Promise<PubmedWatchReport> {
  const candidates = await searchPubmed(MIRACL_AFFILIATION_QUERY, PUBMED_WATCH_RETMAX)
  const pmids = candidates.map((candidate) => candidate.pmid)
  const [linkedArticles, alerted] = await Promise.all([
    prisma.article.findMany({ where: { pubmedId: { in: pmids } }, select: { pubmedId: true } }),
    prisma.publicationPubmedAlert.findMany({ where: { pmid: { in: pmids } }, select: { pmid: true } }),
  ])
  const seen = new Set([...linkedArticles.map((article) => article.pubmedId), ...alerted.map((alert) => alert.pmid)])
  const records = await fetchByPmids(pmids.filter((pmid) => !seen.has(pmid)))
  const library = await loadWatchLibrary()

  const plans = planWatchedPapers(records.map(watchedPaperOf), library)
  const autoLinked: PubmedAlertRow[] = []
  const pending: PubmedAlertRow[] = []

  for (const [index, record] of records.entries()) {
    const { plan } = plans[index]
    if (plan.kind === 'KNOWN') continue
    try {
      const alert = await recordWatchedPaper(record, plan)
      ;(plan.kind === 'AUTO_LINK' ? autoLinked : pending).push(alert)
    } catch (error) {
      console.error(`[publications-pubmed-watch] ${record.pmid} skipped until the next run`, error)
    }
  }


  await prisma.publicationSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, pubmedWatchLastRunAt: new Date() },
    update: { pubmedWatchLastRunAt: new Date() },
  })

  return { found: candidates.length, autoLinked, pending }
}

async function fetchRecord(pmid: string): Promise<PubmedRecord> {
  const [record] = await fetchByPmids([pmid])
  if (!record) throw new Error('PUBMED_RECORD_NOT_FOUND')
  return record
}

async function pendingAlert(alertId: string): Promise<{ id: string; pmid: string }> {
  const alert = await prisma.publicationPubmedAlert.findUnique({ where: { id: alertId }, select: { id: true, pmid: true, status: true } })
  if (!alert || alert.status !== 'PENDING') throw new Error('ALERT_NOT_PENDING')
  return alert
}

export async function linkPubmedAlert(input: { alertId: string; articleId: string; adminId: string }): Promise<{ articleId: string }> {
  const alert = await pendingAlert(input.alertId)
  const alreadyLinked = await prisma.article.findFirst({ where: { pubmedId: alert.pmid }, select: { id: true } })
  if (alreadyLinked && alreadyLinked.id !== input.articleId) throw new Error('PMID_ALREADY_LINKED')
  await linkArticleToPubmedRecord(input.articleId, await fetchRecord(alert.pmid))
  await prisma.publicationPubmedAlert.update({
    where: { id: alert.id },
    data: { status: 'LINKED', articleId: input.articleId, resolvedAt: new Date(), resolvedById: input.adminId },
  })
  return { articleId: input.articleId }
}

export async function importPubmedAlert(input: { alertId: string; adminId: string }): Promise<{ articleId: string }> {
  const alert = await pendingAlert(input.alertId)
  const record = await fetchRecord(alert.pmid)
  const report = await importRecords([record], input.adminId, new Map([[record.pmid, 'LARIB_TEAM']]))
  if (report.errors.length > 0) throw new Error(report.errors[0].message)
  const article = await prisma.article.findFirst({ where: { pubmedId: record.pmid }, select: { id: true } })
  if (!article) throw new Error('IMPORT_FAILED')
  await prisma.publicationPubmedAlert.update({
    where: { id: alert.id },
    data: { status: 'IMPORTED', articleId: article.id, resolvedAt: new Date(), resolvedById: input.adminId },
  })
  return { articleId: article.id }
}

export async function dismissPubmedAlert(alertId: string, adminId: string): Promise<{ id: string }> {
  const dismissed = await prisma.publicationPubmedAlert.updateMany({
    where: { id: alertId, status: 'PENDING' },
    data: { status: 'DISMISSED', resolvedAt: new Date(), resolvedById: adminId },
  })
  if (dismissed.count === 0) throw new Error('ALERT_NOT_PENDING')
  return { id: alertId }
}

export async function listPendingPubmedAlerts(): Promise<PubmedAlertRow[]> {
  const alerts = await prisma.publicationPubmedAlert.findMany({
    where: { status: 'PENDING' },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: ROW_SELECT,
  })
  return alerts.map(toRow)
}

export async function listResolvedPubmedAlerts(): Promise<PubmedAlertRow[]> {
  const alerts = await prisma.publicationPubmedAlert.findMany({
    where: { status: { not: 'PENDING' } },
    orderBy: { resolvedAt: 'desc' },
    take: 50,
    select: ROW_SELECT,
  })
  return alerts.map(toRow)
}

export async function countPendingPubmedAlerts(): Promise<number> {
  return prisma.publicationPubmedAlert.count({ where: { status: 'PENDING' } })
}

export async function getPubmedWatchLastRunAt(): Promise<Date | null> {
  const settings = await prisma.publicationSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { pubmedWatchLastRunAt: true },
  })
  return settings?.pubmedWatchLastRunAt ?? null
}
