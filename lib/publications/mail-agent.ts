import type { ArticleStatusValue } from '@/lib/services/publications/articles'
import type { SubmissionStatusValue } from './status-display'

export const MAIL_EVENT_KINDS = ['SUBMISSION', 'DECISION'] as const
export type MailEventKind = (typeof MAIL_EVENT_KINDS)[number]

export const MAIL_DECISIONS = ['MINOR_REVISIONS', 'MAJOR_REVISIONS', 'ACCEPTED', 'REJECTED'] as const
export type MailDecision = (typeof MAIL_DECISIONS)[number]

export const MAIL_REVIEW_REASONS = [
  'UNKNOWN_ARTICLE',
  'AMBIGUOUS_ARTICLE',
  'UNKNOWN_JOURNAL',
  'NO_MATCHING_SUBMISSION',
  'ACCEPTANCE',
  'OUT_OF_ORDER',
] as const
export type MailReviewReason = (typeof MAIL_REVIEW_REASONS)[number]

export type MailObservation = {
  kind: MailEventKind
  decision: MailDecision | null
  title: string
  journalName: string
  manuscriptNumber: string | null
  eventDate: Date
}

export type CandidateSubmission = {
  id: string
  journalId: string
  journalName: string
  manuscriptNumber: string | null
  status: SubmissionStatusValue
  submittedAt: Date
}

export type CandidateArticle = {
  id: string
  title: string
  status: ArticleStatusValue
  submissions: CandidateSubmission[]
}

export type CandidateJournal = { id: string; name: string }

export type ArticleMatch =
  | { kind: 'MATCHED'; article: CandidateArticle }
  | { kind: 'AMBIGUOUS'; articleIds: string[] }
  | { kind: 'UNKNOWN' }

export type ObservationPlan = {
  resolution: 'AUTO' | 'REVIEW' | 'REDUNDANT'
  reviewReason: MailReviewReason | null
  articleId: string | null
  journalId: string | null
  submissionId: string | null
}

const DAY_IN_MS = 24 * 60 * 60 * 1000
// Two mails about one event (the acknowledgement, then a co-author's forward) never
// land more than a few days apart; a resubmission to the same journal takes weeks.
export const SAME_EVENT_WINDOW_DAYS = 10
const SAME_SUBMISSION_WINDOW_DAYS = 45

function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function normalizeTitle(title: string): string {
  return foldText(title)
}

export function normalizeJournalName(name: string): string {
  return foldText(name).replace(/^the /, '')
}

// "JOFCMR-D-26-00087R3" and "RYCT-26-0401.R1" name the same manuscript as their bare
// number: the suffix only counts revision rounds.
export function baseManuscriptNumber(manuscriptNumber: string): string {
  return manuscriptNumber
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[._-]?R\d+$/, '')
}

export function manuscriptKeyOf(manuscriptNumber: string | null): string | null {
  if (!manuscriptNumber) return null
  const key = baseManuscriptNumber(manuscriptNumber)
  return key.length > 0 ? key : null
}

export function daysBetween(first: Date, second: Date): number {
  return Math.abs(first.getTime() - second.getTime()) / DAY_IN_MS
}

export function matchArticle(observation: MailObservation, candidates: CandidateArticle[]): ArticleMatch {
  const manuscriptKey = manuscriptKeyOf(observation.manuscriptNumber)
  if (manuscriptKey) {
    const byManuscript = candidates.filter((article) =>
      article.submissions.some((submission) => manuscriptKeyOf(submission.manuscriptNumber) === manuscriptKey),
    )
    if (byManuscript.length === 1) return { kind: 'MATCHED', article: byManuscript[0] }
  }

  const titleKey = normalizeTitle(observation.title)
  if (titleKey.length === 0) return { kind: 'UNKNOWN' }
  const byTitle = candidates.filter((article) => normalizeTitle(article.title) === titleKey)
  if (byTitle.length === 1) return { kind: 'MATCHED', article: byTitle[0] }
  if (byTitle.length > 1) return { kind: 'AMBIGUOUS', articleIds: byTitle.map((article) => article.id) }
  return { kind: 'UNKNOWN' }
}

export function matchJournals(journalName: string, journals: CandidateJournal[]): CandidateJournal[] {
  const journalKey = normalizeJournalName(journalName)
  if (journalKey.length === 0) return []
  return journals.filter((journal) => normalizeJournalName(journal.name) === journalKey)
}

function latestSubmission(submissions: CandidateSubmission[]): CandidateSubmission | null {
  return submissions.reduce<CandidateSubmission | null>(
    (latest, submission) => (latest && latest.submittedAt >= submission.submittedAt ? latest : submission),
    null,
  )
}

export function findSubmission(observation: MailObservation, article: CandidateArticle): CandidateSubmission | null {
  const manuscriptKey = manuscriptKeyOf(observation.manuscriptNumber)
  if (manuscriptKey) {
    const byManuscript = article.submissions.filter(
      (submission) => manuscriptKeyOf(submission.manuscriptNumber) === manuscriptKey,
    )
    if (byManuscript.length > 0) return latestSubmission(byManuscript)
  }
  const journalKey = normalizeJournalName(observation.journalName)
  return latestSubmission(
    article.submissions.filter((submission) => normalizeJournalName(submission.journalName) === journalKey),
  )
}

function isSettled(status: SubmissionStatusValue): boolean {
  return status === 'ACCEPTED' || status === 'REJECTED'
}

function isClosed(status: ArticleStatusValue): boolean {
  return status === 'PUBLISHED' || status === 'ABANDONED'
}

function planSubmission(
  observation: MailObservation,
  article: CandidateArticle,
  journalId: string | null,
): ObservationPlan {
  const known = findSubmission(observation, article)
  const base = { articleId: article.id, journalId: known?.journalId ?? journalId }
  const isSameSubmission =
    known != null &&
    (!isSettled(known.status) || daysBetween(known.submittedAt, observation.eventDate) <= SAME_SUBMISSION_WINDOW_DAYS)
  if (known && isSameSubmission) {
    return { ...base, resolution: 'REDUNDANT', reviewReason: null, submissionId: known.id }
  }
  if (base.journalId == null) {
    return { ...base, resolution: 'REVIEW', reviewReason: 'UNKNOWN_JOURNAL', submissionId: null }
  }
  const hasLaterSubmission = article.submissions.some((submission) => submission.submittedAt > observation.eventDate)
  if (hasLaterSubmission) {
    return { ...base, resolution: 'REVIEW', reviewReason: 'OUT_OF_ORDER', submissionId: null }
  }
  return { ...base, resolution: 'AUTO', reviewReason: null, submissionId: null }
}

function planDecision(
  observation: MailObservation,
  article: CandidateArticle,
  journalId: string | null,
): ObservationPlan {
  const known = findSubmission(observation, article)
  if (!known) {
    return { articleId: article.id, journalId, resolution: 'REVIEW', reviewReason: 'NO_MATCHING_SUBMISSION', submissionId: null }
  }
  const base = { articleId: article.id, journalId: known.journalId, submissionId: known.id }
  if (known.status === observation.decision) return { ...base, resolution: 'REDUNDANT', reviewReason: null }
  if (isSettled(known.status)) return { ...base, resolution: 'REVIEW', reviewReason: 'OUT_OF_ORDER' }
  // An acceptance is announced to the whole team by the accepted-papers recap.
  if (observation.decision === 'ACCEPTED') return { ...base, resolution: 'REVIEW', reviewReason: 'ACCEPTANCE' }
  return { ...base, resolution: 'AUTO', reviewReason: null }
}

export function planObservation(
  observation: MailObservation,
  match: ArticleMatch,
  matchingJournals: CandidateJournal[],
): ObservationPlan {
  const journalId = matchingJournals[0]?.id ?? null
  if (match.kind === 'UNKNOWN') {
    return { resolution: 'REVIEW', reviewReason: 'UNKNOWN_ARTICLE', articleId: null, journalId, submissionId: null }
  }
  if (match.kind === 'AMBIGUOUS') {
    return { resolution: 'REVIEW', reviewReason: 'AMBIGUOUS_ARTICLE', articleId: null, journalId, submissionId: null }
  }
  if (isClosed(match.article.status)) {
    return { resolution: 'REDUNDANT', reviewReason: null, articleId: match.article.id, journalId, submissionId: null }
  }
  return observation.kind === 'SUBMISSION'
    ? planSubmission(observation, match.article, journalId)
    : planDecision(observation, match.article, journalId)
}

export type EventKeys = { titleKey: string; journalKey: string; manuscriptKey: string | null }

export function eventKeysOf(observation: MailObservation): EventKeys {
  return {
    titleKey: normalizeTitle(observation.title),
    journalKey: normalizeJournalName(observation.journalName),
    manuscriptKey: manuscriptKeyOf(observation.manuscriptNumber),
  }
}

export type KnownEvent = EventKeys & {
  kind: MailEventKind
  decision: MailDecision | null
  eventDate: Date
}

export function isSameEvent(observation: MailObservation, known: KnownEvent): boolean {
  if (observation.kind !== known.kind || observation.decision !== known.decision) return false
  const keys = eventKeysOf(observation)
  if (keys.journalKey !== known.journalKey) return false
  const sharesManuscript = keys.manuscriptKey != null && keys.manuscriptKey === known.manuscriptKey
  if (!sharesManuscript && keys.titleKey !== known.titleKey) return false
  return daysBetween(observation.eventDate, known.eventDate) <= SAME_EVENT_WINDOW_DAYS
}

function nameParts(name: string): string[] {
  return foldText(name).split(' ').filter((part) => part.length > 0)
}

// Mails write "Theo Pezel" or "Pezel, Théo"; the library writes "Théo Pezel".
export function isSameAuthorName(mailName: string, libraryName: string): boolean {
  const mailParts = nameParts(mailName.includes(',') ? mailName.split(',').reverse().join(' ') : mailName)
  const libraryParts = nameParts(libraryName)
  if (mailParts.length === 0 || libraryParts.length === 0) return false
  if (mailParts.join(' ') === libraryParts.join(' ')) return true
  const sameLastName = mailParts.at(-1) === libraryParts.at(-1)
  const sameInitial = mailParts[0][0] === libraryParts[0][0]
  return sameLastName && sameInitial
}

export function sharedAuthorNames(mailNames: string[], libraryNames: string[]): string[] {
  return libraryNames.filter((libraryName) => mailNames.some((mailName) => isSameAuthorName(mailName, libraryName)))
}

const STALE_AFTER_DAYS = 2

export function isMailAgentStale(lastRunAt: Date | null, now: Date): boolean {
  return lastRunAt != null && daysBetween(lastRunAt, now) > STALE_AFTER_DAYS
}
