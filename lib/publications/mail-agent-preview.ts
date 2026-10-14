import type { ArticleStatusValue } from '@/lib/services/publications/articles'
import { normalizeJournalName, type MailDecision, type MailEventKind } from './mail-agent'
import type { SubmissionStatusValue } from './status-display'
import { articleStatusForSubmission, isRejected } from './submission-rules'

export const NEW_SUBMISSION_ID = 'new-submission'

export type MailTarget = { kind: 'EXISTING'; submissionId: string } | { kind: 'NEW'; journalName: string }

export type PreviewSubmission = {
  id: string
  journalName: string
  submittedAt: string
  status: SubmissionStatusValue
  decidedAt: string | null
}

export type PreviewChange = 'NONE' | 'UPDATED' | 'CREATED' | 'REJECTED'

export type PreviewSubmissionRow = PreviewSubmission & { change: PreviewChange }

export type MailApplicationPreview = {
  articleStatusBefore: ArticleStatusValue
  articleStatusAfter: ArticleStatusValue
  submissions: PreviewSubmissionRow[]
}

export type MailEvent = { kind: MailEventKind; decision: MailDecision | null; eventDate: string }

function markChange(row: PreviewSubmissionRow, change: PreviewChange): PreviewChange {
  return row.change === 'CREATED' ? 'CREATED' : change
}

// Mirrors addSubmission and updateSubmissionStatus: the screen must announce exactly what
// the server is about to write.
export function previewMailApplication(
  event: MailEvent,
  article: { status: ArticleStatusValue; submissions: PreviewSubmission[] },
  target: MailTarget,
): MailApplicationPreview {
  const rows: PreviewSubmissionRow[] = article.submissions.map((submission) => ({ ...submission, change: 'NONE' }))
  let targetId = target.kind === 'EXISTING' ? target.submissionId : NEW_SUBMISSION_ID
  let lastStatus: SubmissionStatusValue | null = null

  if (target.kind === 'NEW') {
    const later = rows
      .filter((row) => row.submittedAt > event.eventDate)
      .sort((first, second) => first.submittedAt.localeCompare(second.submittedAt))[0]
    if (!later) {
      for (const row of rows) {
        if (isRejected(row.status)) continue
        row.status = 'REJECTED'
        row.decidedAt = event.eventDate
        row.change = markChange(row, 'REJECTED')
      }
      lastStatus = 'SUBMITTED'
    }
    rows.push({
      id: NEW_SUBMISSION_ID,
      journalName: target.journalName.trim(),
      submittedAt: event.eventDate,
      status: later ? 'REJECTED' : 'SUBMITTED',
      decidedAt: later ? later.submittedAt : null,
      change: 'CREATED',
    })
    targetId = NEW_SUBMISSION_ID
  }

  const targetRow = rows.find((row) => row.id === targetId)
  if (event.kind === 'DECISION' && event.decision && targetRow) {
    targetRow.status = event.decision
    targetRow.decidedAt = event.eventDate
    targetRow.change = markChange(targetRow, 'UPDATED')
    if (!isRejected(event.decision)) {
      for (const row of rows) {
        if (row.id === targetRow.id || isRejected(row.status)) continue
        row.status = 'REJECTED'
        row.decidedAt = event.eventDate
        row.change = markChange(row, 'REJECTED')
      }
    }
    lastStatus = event.decision
  }

  const articleStatusAfter = lastStatus
    ? articleStatusForSubmission(lastStatus, article.status) ?? article.status
    : article.status
  return {
    articleStatusBefore: article.status,
    articleStatusAfter,
    submissions: rows.sort((first, second) => first.submittedAt.localeCompare(second.submittedAt)),
  }
}

// The submission a mail most likely speaks about, so the admin starts from the right choice.
export function defaultMailTarget(
  event: MailEvent & { journalName: string },
  submissions: PreviewSubmission[],
  suggestedSubmissionId: string | null,
): MailTarget {
  const newSubmission: MailTarget = { kind: 'NEW', journalName: event.journalName }
  if (suggestedSubmissionId && submissions.some((submission) => submission.id === suggestedSubmissionId)) {
    return { kind: 'EXISTING', submissionId: suggestedSubmissionId }
  }
  const journalKey = normalizeJournalName(event.journalName)
  const sameJournal = submissions
    .filter((submission) => normalizeJournalName(submission.journalName) === journalKey)
    .sort((first, second) => second.submittedAt.localeCompare(first.submittedAt))[0]
  return sameJournal ? { kind: 'EXISTING', submissionId: sameJournal.id } : newSubmission
}
