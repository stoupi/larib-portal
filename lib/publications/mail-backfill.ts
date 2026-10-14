import type { ArticleStatusValue } from '@/lib/services/publications/articles'
import type { SubmissionStatusValue } from './status-display'
import { articleStatusBackfill } from './submission-rules'
import {
  daysBetween,
  manuscriptKeyOf,
  matchJournals,
  normalizeJournalName,
  normalizeTitle,
  type CandidateArticle,
  type CandidateJournal,
  type CandidateSubmission,
  type MailDecision,
} from './mail-agent'

export const BACKFILL_EVENT_KINDS = ['SUBMISSION', 'REVISION_SUBMITTED', 'DECISION'] as const
export type BackfillEventKind = (typeof BACKFILL_EVENT_KINDS)[number]

export const BACKFILL_CONFIDENCES = ['HIGH', 'MEDIUM', 'LOW'] as const
export type BackfillConfidence = (typeof BACKFILL_CONFIDENCES)[number]

export type BackfillEvent = {
  messageId: string
  threadUrl: string | null
  subject: string
  kind: BackfillEventKind
  decision: MailDecision | null
  title: string | null
  journalName: string
  manuscriptNumber: string | null
  eventDate: Date
  excerpt: string
  confidence: BackfillConfidence
  note: string | null
}

export type LibrarySubmission = CandidateSubmission & { decidedAt: Date | null }
export type LibraryArticle = Omit<CandidateArticle, 'submissions'> & { submissions: LibrarySubmission[] }

export type ManuscriptGroup = {
  key: string
  journalName: string
  journalKey: string
  title: string | null
  titleKeys: string[]
  manuscriptKeys: string[]
  events: BackfillEvent[]
}

export type ManuscriptHistory = {
  submittedAt: Date
  submittedAtApproximate: boolean
  status: SubmissionStatusValue
  decidedAt: Date | null
}

export type SubmissionAction = 'CREATE' | 'UPDATE' | 'KNOWN'

export type SubmissionChange = {
  status?: SubmissionStatusValue
  decidedAt?: Date | null
  manuscriptNumber?: string
}

export type PlannedSubmission = {
  key: string
  action: SubmissionAction
  journalName: string
  journalId: string | null
  manuscriptNumber: string | null
  history: ManuscriptHistory
  supersededBy: Date | null
  existingSubmissionId: string | null
  changes: SubmissionChange
  events: BackfillEvent[]
}

export type ExistingSubmissionFix = {
  submissionId: string
  journalName: string
  submittedAt: Date
  decidedAt: Date
}

export type ArticleMatchKind = 'MATCHED' | 'NEW' | 'AMBIGUOUS'

export type PlannedArticle = {
  key: string
  match: ArticleMatchKind
  articleId: string | null
  title: string
  currentStatus: ArticleStatusValue | null
  nextStatus: ArticleStatusValue | null
  acceptedAt: Date | null
  ambiguousArticleIds: string[]
  ambiguousArticles: Array<{ id: string; title: string }>
  similarArticles: Array<{ id: string; title: string; similarity: number }>
  submissions: PlannedSubmission[]
  supersededExisting: ExistingSubmissionFix[]
}

export type BackfillPlan = {
  articles: PlannedArticle[]
  unusableEvents: BackfillEvent[]
}

const SAME_SUBMISSION_WINDOW_DAYS = 45
const SIMILAR_TITLE_THRESHOLD = 0.6
const SIMILAR_TITLE_LIMIT = 3

function byEventDate(first: BackfillEvent, second: BackfillEvent): number {
  return first.eventDate.getTime() - second.eventDate.getTime()
}

function isSettled(status: SubmissionStatusValue): boolean {
  return status === 'ACCEPTED' || status === 'REJECTED'
}

function longestTitle(events: BackfillEvent[]): string | null {
  return events.reduce<string | null>(
    (longest, event) => (event.title && event.title.length > (longest?.length ?? 0) ? event.title : longest),
    null,
  )
}

function isSettledDecision(event: BackfillEvent): boolean {
  return event.kind === 'DECISION' && (event.decision === 'REJECTED' || event.decision === 'ACCEPTED')
}

function belongsToGroup(event: BackfillEvent, group: ManuscriptGroup): boolean {
  const manuscriptKey = backfillManuscriptKey(event.manuscriptNumber)
  if (manuscriptKey && group.manuscriptKeys.includes(manuscriptKey)) return true
  if (normalizeJournalName(event.journalName) !== group.journalKey) return false
  if (manuscriptKey && group.manuscriptKeys.length > 0) return false
  // A paper resubmitted "de novo" to the journal that rejected it is a second submission.
  if (event.kind === 'SUBMISSION' && group.events.some(isSettledDecision)) return false
  const titleKey = event.title ? normalizeTitle(event.title) : ''
  if (titleKey.length > 0 && group.titleKeys.includes(titleKey)) return true
  return event.title != null && group.title != null && titleSimilarity(event.title, group.title) >= SAME_PAPER_THRESHOLD
}

function addToGroup(group: ManuscriptGroup, event: BackfillEvent): void {
  group.events.push(event)
  const manuscriptKey = backfillManuscriptKey(event.manuscriptNumber)
  if (manuscriptKey && !group.manuscriptKeys.includes(manuscriptKey)) group.manuscriptKeys.push(manuscriptKey)
  const titleKey = event.title ? normalizeTitle(event.title) : ''
  if (titleKey.length > 0 && !group.titleKeys.includes(titleKey)) group.titleKeys.push(titleKey)
  group.title = longestTitle(group.events)
}

// A co-author confirmation names the paper but not its number; once a numbered letter
// carries the same title at the same journal, both describe one manuscript.
function absorbUnnumberedTwins(groups: ManuscriptGroup[], target: ManuscriptGroup, event: BackfillEvent): void {
  const titleKey = event.title ? normalizeTitle(event.title) : ''
  if (titleKey.length === 0) return
  const twins = groups.filter(
    (candidate) =>
      candidate !== target &&
      candidate.manuscriptKeys.length === 0 &&
      candidate.journalKey === target.journalKey &&
      candidate.titleKeys.includes(titleKey) &&
      !candidate.events.some(isSettledDecision),
  )
  for (const twin of twins) {
    for (const twinEvent of twin.events) addToGroup(target, twinEvent)
    groups.splice(groups.indexOf(twin), 1)
  }
}

const REVISION_SUFFIX = /(?:[._-]?R\d*|-T\d*)$/

// Journals mark revision rounds and transfers in their own way: "JACC053126-2680R",
// "JADV100725-1662-TRR", "CIRCCQO/2024/011905-T2" all name their bare number. A trailing
// "D" (de novo resubmission) is a new manuscript and is kept.
// Elsevier names an accepted paper by a production id ("ACVD_1764", "JOCMR_102808")
// that no editorial letter ever quotes.
const PRODUCTION_ID = /^[A-Z]+_\d+$/

export function backfillManuscriptKey(manuscriptNumber: string | null): string | null {
  let key = manuscriptKeyOf(manuscriptNumber)
  if (key && PRODUCTION_ID.test(key)) return null
  while (key) {
    const stripped = key.replace(REVISION_SUFFIX, '')
    if (stripped === key || stripped.length === 0) break
    key = stripped
  }
  return key
}

export function groupManuscripts(events: BackfillEvent[]): { groups: ManuscriptGroup[]; unusable: BackfillEvent[] } {
  const groups: ManuscriptGroup[] = []
  const unusable: BackfillEvent[] = []
  for (const event of [...events].sort(byEventDate)) {
    const hasTitle = event.title != null && normalizeTitle(event.title).length > 0
    if (!hasTitle && !backfillManuscriptKey(event.manuscriptNumber)) {
      unusable.push(event)
      continue
    }
    const manuscriptKey = backfillManuscriptKey(event.manuscriptNumber)
    const byManuscript = manuscriptKey ? groups.find((candidate) => candidate.manuscriptKeys.includes(manuscriptKey)) : undefined
    const group = byManuscript ?? groups.findLast((candidate) => belongsToGroup(event, candidate))
    if (group) {
      addToGroup(group, event)
      if (manuscriptKey) absorbUnnumberedTwins(groups, group, event)
      continue
    }
    const created: ManuscriptGroup = {
      key: `manuscript-${groups.length + 1}`,
      journalName: event.journalName.trim(),
      journalKey: normalizeJournalName(event.journalName),
      title: null,
      titleKeys: [],
      manuscriptKeys: [],
      events: [],
    }
    addToGroup(created, event)
    groups.push(created)
  }
  return { groups, unusable }
}

function statusAfter(event: BackfillEvent, current: SubmissionStatusValue): SubmissionStatusValue {
  if (current === 'ACCEPTED') return current
  if (event.kind === 'DECISION' && event.decision) return event.decision
  if (event.kind === 'REVISION_SUBMITTED') return 'UNDER_REVIEW'
  return current
}

export function manuscriptHistory(events: BackfillEvent[]): ManuscriptHistory {
  const ordered = [...events].sort(byEventDate)
  let status: SubmissionStatusValue = 'SUBMITTED'
  let decidedAt: Date | null = null
  for (const event of ordered) {
    const next = statusAfter(event, status)
    if (next !== status && event.kind === 'DECISION') decidedAt = event.eventDate
    if (event.kind === 'REVISION_SUBMITTED' && status !== 'ACCEPTED') decidedAt = null
    status = next
  }
  return {
    submittedAt: ordered[0].eventDate,
    submittedAtApproximate: ordered[0].kind !== 'SUBMISSION',
    status,
    decidedAt: status === 'SUBMITTED' || status === 'UNDER_REVIEW' ? null : decidedAt,
  }
}

function titleWords(title: string): Set<string> {
  return new Set(normalizeTitle(title).split(' ').filter((word) => word.length > 2))
}

export function titleSimilarity(first: string, second: string): number {
  const firstWords = titleWords(first)
  const secondWords = titleWords(second)
  if (firstWords.size === 0 || secondWords.size === 0) return 0
  const shared = [...firstWords].filter((word) => secondWords.has(word)).length
  return shared / (firstWords.size + secondWords.size - shared)
}

function similarArticles(title: string, library: LibraryArticle[]) {
  return library
    .map((article) => ({ id: article.id, title: article.title, similarity: titleSimilarity(title, article.title) }))
    .filter((candidate) => candidate.similarity >= SIMILAR_TITLE_THRESHOLD)
    .sort((first, second) => second.similarity - first.similarity)
    .slice(0, SIMILAR_TITLE_LIMIT)
}

type GroupMatch = { kind: ArticleMatchKind; article: LibraryArticle | null; ambiguousIds: string[] }

// Maps a normalised mail title to the article it was published under, for papers whose
// title changed between submission and publication.
export type TitleLinks = Record<string, string>

function matchGroup(group: ManuscriptGroup, library: LibraryArticle[], links: TitleLinks): GroupMatch {
  const linkedId = group.titleKeys.map((titleKey) => links[titleKey]).find(Boolean)
  const linked = linkedId ? library.find((article) => article.id === linkedId) : undefined
  if (linked) return { kind: 'MATCHED', article: linked, ambiguousIds: [] }

  // Every number and every title a manuscript went by must point at the same article;
  // a letter quoting another paper's title would otherwise file it silently elsewhere.
  const candidateIds = new Set<string>()
  for (const manuscriptKey of group.manuscriptKeys) {
    const byManuscript = library.filter((article) =>
      article.submissions.some((submission) => backfillManuscriptKey(submission.manuscriptNumber) === manuscriptKey),
    )
    if (byManuscript.length === 1) candidateIds.add(byManuscript[0].id)
  }
  for (const titleKey of group.titleKeys) {
    for (const article of library.filter((candidate) => normalizeTitle(candidate.title) === titleKey)) {
      candidateIds.add(article.id)
    }
  }
  if (candidateIds.size === 1) {
    const article = library.find((candidate) => candidateIds.has(candidate.id)) ?? null
    return { kind: 'MATCHED', article, ambiguousIds: [] }
  }
  if (candidateIds.size > 1) return { kind: 'AMBIGUOUS', article: null, ambiguousIds: [...candidateIds] }
  return { kind: 'NEW', article: null, ambiguousIds: [] }
}

function findExistingSubmission(
  group: ManuscriptGroup,
  history: ManuscriptHistory,
  article: LibraryArticle,
  journals: CandidateJournal[],
): LibrarySubmission | null {
  const sameJournalIds = new Set(matchJournals(group.journalName, journals).map((journal) => journal.id))
  const byManuscript = article.submissions.find((submission) => {
    const submissionKey = backfillManuscriptKey(submission.manuscriptNumber)
    return submissionKey != null && group.manuscriptKeys.includes(submissionKey)
  })
  if (byManuscript) return byManuscript
  return (
    article.submissions.find(
      (submission) =>
        (sameJournalIds.has(submission.journalId) || normalizeJournalName(submission.journalName) === group.journalKey) &&
        (!isSettled(submission.status) ||
          daysBetween(submission.submittedAt, history.submittedAt) <= SAME_SUBMISSION_WINDOW_DAYS),
    ) ?? null
  )
}

function changesFor(existing: LibrarySubmission, history: ManuscriptHistory, manuscriptKey: string | null): SubmissionChange {
  const changes: SubmissionChange = {}
  const mailIsNewer =
    history.status !== existing.status &&
    !(existing.status === 'ACCEPTED') &&
    (existing.decidedAt == null || (history.decidedAt != null && history.decidedAt > existing.decidedAt))
  if (mailIsNewer) {
    changes.status = history.status
    changes.decidedAt = history.decidedAt
  } else if (existing.status === history.status && existing.decidedAt == null && history.decidedAt != null) {
    changes.decidedAt = history.decidedAt
  }
  if (existing.manuscriptNumber == null && manuscriptKey) changes.manuscriptNumber = manuscriptKey
  return changes
}

function planSubmission(
  group: ManuscriptGroup,
  article: LibraryArticle | null,
  journals: CandidateJournal[],
): PlannedSubmission {
  const history = manuscriptHistory(group.events)
  const manuscriptNumber = group.manuscriptKeys[0] ?? null
  const existing = article ? findExistingSubmission(group, history, article, journals) : null
  const journalId = existing?.journalId ?? matchJournals(group.journalName, journals)[0]?.id ?? null
  const journalName = existing?.journalName ?? journals.find((journal) => journal.id === journalId)?.name ?? group.journalName
  const changes = existing ? changesFor(existing, history, manuscriptNumber) : {}
  const action: SubmissionAction = !existing ? 'CREATE' : Object.keys(changes).length > 0 ? 'UPDATE' : 'KNOWN'
  return {
    key: group.key,
    action,
    journalName,
    journalId,
    manuscriptNumber,
    history,
    supersededBy: null,
    existingSubmissionId: existing?.id ?? null,
    changes,
    events: [...group.events].sort(byEventDate),
  }
}

type Timeline = { submittedAt: Date; status: SubmissionStatusValue; existingId: string | null; planned: PlannedSubmission | null }

export function finalStatus(planned: PlannedSubmission): SubmissionStatusValue {
  return planned.changes.status ?? planned.history.status
}

export function finalDecidedAt(planned: PlannedSubmission): Date | null {
  return 'decidedAt' in planned.changes ? (planned.changes.decidedAt ?? null) : planned.history.decidedAt
}

// A paper sits at one journal at a time: once it is sent elsewhere, the earlier
// submission is over even when no rejection letter was kept.
function closeSupersededSubmissions(article: LibraryArticle | null, planned: PlannedSubmission[]): ExistingSubmissionFix[] {
  const touchedIds = new Set(planned.map((submission) => submission.existingSubmissionId).filter(Boolean))
  const timeline: Timeline[] = [
    ...(article?.submissions ?? [])
      .filter((submission) => !touchedIds.has(submission.id))
      .map((submission) => ({ submittedAt: submission.submittedAt, status: submission.status, existingId: submission.id, planned: null })),
    ...planned.map((submission) => ({
      submittedAt: submission.history.submittedAt,
      status: finalStatus(submission),
      existingId: submission.existingSubmissionId,
      planned: submission,
    })),
  ].sort((first, second) => first.submittedAt.getTime() - second.submittedAt.getTime())

  const fixes: ExistingSubmissionFix[] = []
  timeline.forEach((entry, index) => {
    const next = timeline[index + 1]
    if (!next || entry.status === 'REJECTED' || entry.status === 'ACCEPTED') return
    if (entry.planned) {
      entry.planned.supersededBy = next.submittedAt
      if (entry.planned.action === 'KNOWN') entry.planned.action = 'UPDATE'
      entry.planned.changes = { ...entry.planned.changes, status: 'REJECTED', decidedAt: next.submittedAt }
      return
    }
    const existing = article?.submissions.find((submission) => submission.id === entry.existingId)
    if (existing) {
      fixes.push({ submissionId: existing.id, journalName: existing.journalName, submittedAt: existing.submittedAt, decidedAt: next.submittedAt })
    }
  })
  return fixes
}

function latestStatus(article: LibraryArticle | null, planned: PlannedSubmission[]): SubmissionStatusValue | null {
  const touchedIds = new Set(planned.map((submission) => submission.existingSubmissionId).filter(Boolean))
  const entries = [
    ...(article?.submissions ?? [])
      .filter((submission) => !touchedIds.has(submission.id))
      .map((submission) => ({ submittedAt: submission.submittedAt, status: submission.status })),
    ...planned.map((submission) => ({ submittedAt: submission.history.submittedAt, status: finalStatus(submission) })),
  ]
  const latest = entries.reduce<(typeof entries)[number] | null>(
    (current, entry) => (current && current.submittedAt >= entry.submittedAt ? current : entry),
    null,
  )
  return latest?.status ?? null
}

function acceptanceDate(planned: PlannedSubmission[]): Date | null {
  const accepted = planned.find((submission) => finalStatus(submission) === 'ACCEPTED')
  return accepted ? finalDecidedAt(accepted) : null
}

type ArticleBucket = { key: string; match: GroupMatch; groups: ManuscriptGroup[] }

const SAME_PAPER_THRESHOLD = 0.85

// A paper sent to a new journal often comes back with a reworded title.
function sharesPaper(bucket: ArticleBucket, group: ManuscriptGroup): boolean {
  return bucket.groups.some(
    (member) =>
      group.titleKeys.some((key) => member.titleKeys.includes(key)) ||
      (member.title != null && group.title != null && titleSimilarity(member.title, group.title) >= SAME_PAPER_THRESHOLD),
  )
}

function bucketGroups(groups: ManuscriptGroup[], library: LibraryArticle[], links: TitleLinks): ArticleBucket[] {
  const buckets: ArticleBucket[] = []
  for (const group of groups) {
    const match = matchGroup(group, library, links)
    const titleKey = group.titleKeys[0] ?? group.key
    const bucketKey = match.article ? match.article.id : `new:${titleKey}`
    const bucket =
      buckets.find((candidate) => candidate.key === bucketKey) ??
      (match.article ? undefined : buckets.find((candidate) => !candidate.match.article && sharesPaper(candidate, group)))
    if (bucket) {
      bucket.groups.push(group)
      continue
    }
    buckets.push({ key: bucketKey, match, groups: [group] })
  }
  return buckets
}

export function planBackfill(
  events: BackfillEvent[],
  library: LibraryArticle[],
  journals: CandidateJournal[],
  links: TitleLinks = {},
): BackfillPlan {
  const { groups, unusable } = groupManuscripts(events)
  const articles = bucketGroups(groups, library, links).map((bucket): PlannedArticle => {
    const article = bucket.match.article
    const submissions = bucket.groups
      .map((group) => planSubmission(group, article, journals))
      .sort((first, second) => first.history.submittedAt.getTime() - second.history.submittedAt.getTime())
    const supersededExisting = closeSupersededSubmissions(article, submissions)
    const latest = latestStatus(article, submissions)
    const currentStatus = article?.status ?? null
    const nextStatus = latest ? articleStatusBackfill(latest, currentStatus ?? 'IN_PREPARATION') : null
    const title = article?.title ?? longestTitle(bucket.groups.flatMap((group) => group.events)) ?? bucket.groups[0].key
    return {
      key: bucket.key,
      match: bucket.match.kind,
      articleId: article?.id ?? null,
      title,
      currentStatus,
      nextStatus,
      acceptedAt: acceptanceDate(submissions),
      ambiguousArticleIds: bucket.match.ambiguousIds,
      ambiguousArticles: library
        .filter((candidate) => bucket.match.ambiguousIds.includes(candidate.id))
        .map((candidate) => ({ id: candidate.id, title: candidate.title })),
      similarArticles: article ? [] : similarArticles(title, library),
      submissions,
      supersededExisting,
    }
  })
  return { articles, unusableEvents: unusable }
}

export function hasWork(article: PlannedArticle): boolean {
  return (
    article.match === 'NEW' ||
    article.submissions.some((submission) => submission.action !== 'KNOWN') ||
    article.supersededExisting.length > 0 ||
    (article.nextStatus != null && article.nextStatus !== article.currentStatus)
  )
}
