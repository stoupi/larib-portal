import type { SubmissionStatusValue } from './status-display'

export type JournalSubmissionInput = {
  status: SubmissionStatusValue
  submittedAt: Date
  decidedAt: Date | null
  articlePublishedAt: Date | null
  articlePublishedJournalId: string | null
}

export type JournalProfile = {
  abbreviation: string | null
  specialty: string | null
  subSpecialty: string | null
  openAccess: boolean
  typicalDelayDays: number | null
}

export type JournalMetricsInput = JournalProfile & {
  id: string
  name: string
  issn: string | null
  publisher: string | null
  impactFactor: number | null
  sjr: number | null
  url: string | null
  publishedCount: number
  submissions: JournalSubmissionInput[]
}

export type JournalMetrics = JournalProfile & {
  id: string
  name: string
  issn: string | null
  publisher: string | null
  impactFactor: number | null
  sjr: number | null
  url: string | null
  publishedCount: number
  ongoingCount: number
  acceptedCount: number
  submittedCount: number
  acceptanceRate: number | null
  avgDelayDays: number | null
}

export type JournalBankSummary = {
  journalCount: number
  publishedTotal: number
  ongoingTotal: number
  acceptedTotal: number
  submittedTotal: number
  acceptanceRate: number | null
  avgDelayDays: number | null
  fastestJournal: { name: string; delayDays: number } | null
}

export type ImpactBucket = 'high' | 'mid' | 'low'
export const IMPACT_BUCKETS: ImpactBucket[] = ['high', 'mid', 'low']

const PENDING_STATUSES: SubmissionStatusValue[] = ['SUBMITTED', 'UNDER_REVIEW', 'MINOR_REVISIONS', 'MAJOR_REVISIONS']
const DAY_IN_MS = 24 * 60 * 60 * 1000
export const DAYS_IN_MONTH = 30.44

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / DAY_IN_MS
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function impactBucket(impactFactor: number | null): ImpactBucket | null {
  if (impactFactor == null) return null
  if (impactFactor >= 20) return 'high'
  if (impactFactor >= 5) return 'mid'
  return 'low'
}

export function daysToMonths(days: number): number {
  return Math.round((days / DAYS_IN_MONTH) * 10) / 10
}

export function computeJournalMetrics(journals: JournalMetricsInput[]): JournalMetrics[] {
  return journals.map((journal) => {
    let ongoingCount = 0
    let acceptedCount = 0
    const publicationDelays: number[] = []
    const decisionDelays: number[] = []

    for (const submission of journal.submissions) {
      if (PENDING_STATUSES.includes(submission.status)) ongoingCount += 1
      if (submission.status === 'ACCEPTED') acceptedCount += 1
      if (
        submission.articlePublishedJournalId === journal.id &&
        submission.articlePublishedAt != null &&
        submission.articlePublishedAt >= submission.submittedAt
      ) {
        publicationDelays.push(daysBetween(submission.submittedAt, submission.articlePublishedAt))
      } else if (submission.status === 'ACCEPTED' && submission.decidedAt != null && submission.decidedAt >= submission.submittedAt) {
        decisionDelays.push(daysBetween(submission.submittedAt, submission.decidedAt))
      }
    }

    const submittedCount = journal.submissions.length
    return {
      id: journal.id,
      name: journal.name,
      issn: journal.issn,
      abbreviation: journal.abbreviation,
      specialty: journal.specialty,
      subSpecialty: journal.subSpecialty,
      openAccess: journal.openAccess,
      typicalDelayDays: journal.typicalDelayDays,
      publisher: journal.publisher,
      impactFactor: journal.impactFactor,
      sjr: journal.sjr,
      url: journal.url,
      publishedCount: journal.publishedCount,
      ongoingCount,
      acceptedCount,
      submittedCount,
      acceptanceRate: submittedCount === 0 ? null : Math.round((acceptedCount / submittedCount) * 100),
      avgDelayDays: average(publicationDelays.length > 0 ? publicationDelays : decisionDelays),
    }
  })
}

export function computeJournalBankSummary(metrics: JournalMetrics[]): JournalBankSummary {
  let publishedTotal = 0
  let ongoingTotal = 0
  let acceptedTotal = 0
  let submittedTotal = 0
  let weightedDelay = 0
  let weightedDelayBase = 0
  let fastestJournal: { name: string; delayDays: number } | null = null

  for (const journal of metrics) {
    publishedTotal += journal.publishedCount
    ongoingTotal += journal.ongoingCount
    acceptedTotal += journal.acceptedCount
    submittedTotal += journal.submittedCount
    if (journal.avgDelayDays == null) continue
    const weight = Math.max(1, journal.publishedCount)
    weightedDelay += journal.avgDelayDays * weight
    weightedDelayBase += weight
    if (journal.publishedCount > 0 && (fastestJournal == null || journal.avgDelayDays < fastestJournal.delayDays)) {
      fastestJournal = { name: journal.name, delayDays: journal.avgDelayDays }
    }
  }

  return {
    journalCount: metrics.length,
    publishedTotal,
    ongoingTotal,
    acceptedTotal,
    submittedTotal,
    acceptanceRate: submittedTotal === 0 ? null : Math.round((acceptedTotal / submittedTotal) * 100),
    avgDelayDays: weightedDelayBase === 0 ? null : weightedDelay / weightedDelayBase,
    fastestJournal,
  }
}
