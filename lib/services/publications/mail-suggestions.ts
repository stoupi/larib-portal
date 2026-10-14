import { prisma } from '@/lib/prisma'
import {
  SAME_EVENT_WINDOW_DAYS,
  eventKeysOf,
  findSubmission,
  isSameEvent,
  matchArticle,
  matchJournals,
  planObservation,
  type CandidateArticle,
  type CandidateJournal,
  type MailDecision,
  type MailEventKind,
  type MailObservation,
  type MailReviewReason,
  type ObservationPlan,
} from '@/lib/publications/mail-agent'
import type { SubmissionStatusValue } from '@/lib/publications/status-display'
import type { ArticleStatusValue } from './articles'
import { applyMailEvent, loadCandidateArticle } from './mail-suggestion-apply'

export const PUBLICATIONS_MAIL_SUGGESTIONS_TAG = 'publications:mail-suggestions'

const SETTINGS_ID = 'singleton'
const DAY_IN_MS = 24 * 60 * 60 * 1000

export type MailSource = {
  messageId: string
  threadUrl: string | null
  sender: string
  subject: string
  body: string | null
  receivedAt: Date
}

export type IncomingObservation = MailObservation & MailSource & { excerpt: string; authors: string[] }

export type IngestOutcome = 'ALREADY_SEEN' | 'MERGED' | 'AUTO_APPLIED' | 'PENDING' | 'REDUNDANT'

export type IngestResult = { messageId: string; outcome: IngestOutcome; suggestionId: string }

type Library = { articles: CandidateArticle[]; journals: CandidateJournal[] }

async function loadLibrary(): Promise<Library> {
  const [articles, journals] = await Promise.all([
    prisma.article.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        submissions: {
          select: {
            id: true,
            journalId: true,
            manuscriptNumber: true,
            status: true,
            submittedAt: true,
            journal: { select: { name: true } },
          },
        },
      },
    }),
    loadJournals(),
  ])
  return {
    articles: articles.map((article) => ({
      id: article.id,
      title: article.title,
      status: article.status as ArticleStatusValue,
      submissions: article.submissions.map((submission) => ({
        id: submission.id,
        journalId: submission.journalId,
        journalName: submission.journal.name,
        manuscriptNumber: submission.manuscriptNumber,
        status: submission.status as SubmissionStatusValue,
        submittedAt: submission.submittedAt,
      })),
    })),
    journals,
  }
}

// Duplicate journal rows exist under punctuation variants: the most used one wins.
async function loadJournals(): Promise<CandidateJournal[]> {
  const journals = await prisma.journal.findMany({
    select: { id: true, name: true, abbreviation: true, _count: { select: { submissions: true } } },
  })
  return [...journals]
    .sort((first, second) => second._count.submissions - first._count.submissions)
    .map((journal) => ({ id: journal.id, name: journal.name, abbreviation: journal.abbreviation }))
}

async function findSameEvent(observation: MailObservation): Promise<string | null> {
  const keys = eventKeysOf(observation)
  const windowMs = SAME_EVENT_WINDOW_DAYS * DAY_IN_MS
  const nearby = await prisma.publicationMailSuggestion.findMany({
    where: {
      kind: observation.kind,
      decision: observation.decision,
      journalKey: keys.journalKey,
      eventDate: {
        gte: new Date(observation.eventDate.getTime() - windowMs),
        lte: new Date(observation.eventDate.getTime() + windowMs),
      },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, kind: true, decision: true, titleKey: true, journalKey: true, manuscriptKey: true, eventDate: true },
  })
  const same = nearby.find((suggestion) =>
    isSameEvent(observation, { ...suggestion, decision: suggestion.decision as MailDecision | null }),
  )
  return same?.id ?? null
}

function sourceData(mailbox: string, observation: IncomingObservation) {
  return {
    mailbox,
    messageId: observation.messageId,
    threadUrl: observation.threadUrl,
    sender: observation.sender,
    subject: observation.subject,
    body: observation.body,
    receivedAt: observation.receivedAt,
  }
}

async function applyAutomatically(
  observation: IncomingObservation,
  plan: ObservationPlan,
  library: Library,
): Promise<string | null> {
  const journal = library.journals.find((candidate) => candidate.id === plan.journalId)
  if (!plan.articleId || !journal) return null
  try {
    const applied = await applyMailEvent({
      kind: observation.kind,
      decision: observation.decision,
      articleId: plan.articleId,
      journalName: journal.name,
      submissionId: plan.submissionId,
      manuscriptNumber: observation.manuscriptNumber,
      eventDate: observation.eventDate,
    })
    return applied.submissionId
  } catch (error) {
    console.error('Mail agent could not apply an observation:', error)
    return null
  }
}

function uniqueNames(names: string[]): string[] {
  return [...new Set(names.map((name) => name.trim()).filter((name) => name.length > 0))]
}

async function addAuthorNames(suggestionId: string, names: string[]): Promise<void> {
  if (names.length === 0) return
  const suggestion = await prisma.publicationMailSuggestion.findUniqueOrThrow({
    where: { id: suggestionId },
    select: { authorNames: true },
  })
  await prisma.publicationMailSuggestion.update({
    where: { id: suggestionId },
    data: { authorNames: uniqueNames([...suggestion.authorNames, ...names]) },
  })
}

async function ingestOne(mailbox: string, observation: IncomingObservation): Promise<IngestResult> {
  const seen = await prisma.publicationMailSource.findUnique({
    where: { mailbox_messageId: { mailbox, messageId: observation.messageId } },
    select: { suggestionId: true },
  })
  if (seen) return { messageId: observation.messageId, outcome: 'ALREADY_SEEN', suggestionId: seen.suggestionId }

  const sameEventId = await findSameEvent(observation)
  if (sameEventId) {
    await prisma.publicationMailSource.create({ data: { suggestionId: sameEventId, ...sourceData(mailbox, observation) } })
    await addAuthorNames(sameEventId, observation.authors)
    return { messageId: observation.messageId, outcome: 'MERGED', suggestionId: sameEventId }
  }

  const library = await loadLibrary()
  const plan = planObservation(
    observation,
    matchArticle(observation, library.articles),
    matchJournals(observation.journalName, library.journals),
  )
  const appliedSubmissionId = plan.resolution === 'AUTO' ? await applyAutomatically(observation, plan, library) : null
  const outcome: IngestOutcome =
    plan.resolution === 'REDUNDANT' ? 'REDUNDANT' : appliedSubmissionId ? 'AUTO_APPLIED' : 'PENDING'

  const created = await prisma.publicationMailSuggestion.create({
    data: {
      kind: observation.kind,
      decision: observation.decision,
      title: observation.title.trim(),
      journalName: observation.journalName.trim(),
      manuscriptNumber: observation.manuscriptNumber,
      eventDate: observation.eventDate,
      excerpt: observation.excerpt,
      authorNames: uniqueNames(observation.authors),
      ...eventKeysOf(observation),
      status: outcome,
      reviewReason: outcome === 'PENDING' ? plan.reviewReason : null,
      articleId: plan.articleId,
      journalId: plan.journalId,
      submissionId: appliedSubmissionId ?? plan.submissionId,
      resolvedAt: outcome === 'PENDING' ? null : new Date(),
      sources: { create: sourceData(mailbox, observation) },
    },
    select: { id: true },
  })
  return { messageId: observation.messageId, outcome, suggestionId: created.id }
}

export async function ingestMailObservations(
  mailbox: string,
  observations: IncomingObservation[],
): Promise<IngestResult[]> {
  await prisma.publicationSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { mailAgentLastRunAt: new Date() },
    create: { id: SETTINGS_ID, mailAgentLastRunAt: new Date() },
  })
  const chronological = [...observations].sort(
    (first, second) => first.eventDate.getTime() - second.eventDate.getTime(),
  )
  const results: IngestResult[] = []
  for (const observation of chronological) {
    results.push(await ingestOne(mailbox, observation))
  }
  return results
}

export type MailSourceView = {
  id: string
  sender: string
  subject: string
  body: string | null
  receivedAt: string
  threadUrl: string | null
}

export type MailSuggestionRow = {
  id: string
  kind: MailEventKind
  decision: MailDecision | null
  title: string
  journalName: string
  manuscriptNumber: string | null
  eventDate: string
  excerpt: string
  authorNames: string[]
  status: 'PENDING' | 'APPLIED' | 'AUTO_APPLIED' | 'REDUNDANT' | 'DISMISSED'
  reviewReason: MailReviewReason | null
  article: { id: string; title: string; status: ArticleStatusValue } | null
  resolvedJournalName: string | null
  suggestedSubmissionId: string | null
  resolvedAt: string | null
  sources: MailSourceView[]
}

const ROW_SELECT = {
  id: true,
  kind: true,
  decision: true,
  title: true,
  journalName: true,
  manuscriptNumber: true,
  eventDate: true,
  excerpt: true,
  authorNames: true,
  submissionId: true,
  status: true,
  reviewReason: true,
  resolvedAt: true,
  article: { select: { id: true, title: true, status: true } },
  journal: { select: { name: true } },
  sources: {
    orderBy: { receivedAt: 'asc' },
    select: { id: true, sender: true, subject: true, body: true, receivedAt: true, threadUrl: true },
  },
} as const

type SelectedRow = Awaited<ReturnType<typeof selectRows>>[number]

function selectRows(where: { status: 'PENDING' } | { status: { not: 'PENDING' } }, take: number) {
  return prisma.publicationMailSuggestion.findMany({
    where,
    orderBy: where.status === 'PENDING' ? { eventDate: 'desc' } : { resolvedAt: 'desc' },
    take,
    select: ROW_SELECT,
  })
}

function toRow(suggestion: SelectedRow): MailSuggestionRow {
  return {
    id: suggestion.id,
    kind: suggestion.kind,
    decision: suggestion.decision as MailDecision | null,
    title: suggestion.title,
    journalName: suggestion.journalName,
    manuscriptNumber: suggestion.manuscriptNumber,
    eventDate: suggestion.eventDate.toISOString(),
    excerpt: suggestion.excerpt,
    authorNames: suggestion.authorNames,
    status: suggestion.status,
    reviewReason: suggestion.reviewReason,
    article: suggestion.article
      ? { id: suggestion.article.id, title: suggestion.article.title, status: suggestion.article.status as ArticleStatusValue }
      : null,
    resolvedJournalName: suggestion.journal?.name ?? null,
    suggestedSubmissionId: suggestion.submissionId,
    resolvedAt: suggestion.resolvedAt ? suggestion.resolvedAt.toISOString() : null,
    sources: suggestion.sources.map((source) => ({ ...source, receivedAt: source.receivedAt.toISOString() })),
  }
}

async function withSuggestedSubmission(row: MailSuggestionRow, journals: CandidateJournal[]): Promise<MailSuggestionRow> {
  if (!row.article) return row
  const article = await loadCandidateArticle(row.article.id)
  if (!article) return row
  const known = findSubmission(
    {
      kind: row.kind,
      decision: row.decision,
      title: row.title,
      journalName: row.journalName,
      manuscriptNumber: row.manuscriptNumber,
      eventDate: new Date(row.eventDate),
    },
    article,
    matchJournals(row.journalName, journals).map((journal) => journal.id),
  )
  return { ...row, suggestedSubmissionId: known?.id ?? null }
}

export async function listPendingMailSuggestions(): Promise<MailSuggestionRow[]> {
  const [rows, journals] = await Promise.all([selectRows({ status: 'PENDING' }, 200), loadJournals()])
  return Promise.all(rows.map((row) => withSuggestedSubmission(toRow(row), journals)))
}

export async function listResolvedMailSuggestions(): Promise<MailSuggestionRow[]> {
  return (await selectRows({ status: { not: 'PENDING' } }, 50)).map(toRow)
}

export async function countPendingMailSuggestions(): Promise<number> {
  return prisma.publicationMailSuggestion.count({ where: { status: 'PENDING' } })
}

export async function getMailAgentLastRunAt(): Promise<Date | null> {
  const settings = await prisma.publicationSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { mailAgentLastRunAt: true },
  })
  return settings?.mailAgentLastRunAt ?? null
}
