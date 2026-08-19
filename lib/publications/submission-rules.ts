import type { SubmissionStatusValue } from './status-display'
import type { ArticleStatusValue } from '@/lib/services/publications/articles'

// The publication status follows its live submission: a decision at the journal is the
// publication's own news, so it never has to be restated by hand.
const ARTICLE_STATUS_BY_SUBMISSION: Record<SubmissionStatusValue, ArticleStatusValue> = {
  SUBMITTED: 'UNDER_REVIEW',
  UNDER_REVIEW: 'UNDER_REVIEW',
  MINOR_REVISIONS: 'REVISION',
  MAJOR_REVISIONS: 'REVISION',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'TO_RESUBMIT',
}

// A published paper has outlived its submissions: a late edit to the history must not
// drag it back into the pipeline.
export function articleStatusForSubmission(
  submissionStatus: SubmissionStatusValue,
  currentArticleStatus: ArticleStatusValue,
): ArticleStatusValue | null {
  if (currentArticleStatus === 'PUBLISHED' || currentArticleStatus === 'ABANDONED') return null
  const next = ARTICLE_STATUS_BY_SUBMISSION[submissionStatus]
  return next === currentArticleStatus ? null : next
}

export function isRejected(status: SubmissionStatusValue): boolean {
  return status === 'REJECTED'
}

// A paper is under review at only one journal at a time: when one submission
// becomes active (non-rejected), every other still-active submission is rejected.
export function siblingsToReject(
  submissions: Array<{ id: string; status: SubmissionStatusValue }>,
  keepId: string,
): string[] {
  return submissions
    .filter((submission) => submission.id !== keepId && !isRejected(submission.status))
    .map((submission) => submission.id)
}
