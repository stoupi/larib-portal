export const PENDING_MONTH_THRESHOLD_DAYS = 30

export type PendingDelay = { unit: 'days'; days: number } | { unit: 'months'; months: number }

// Past a month, a day count stops telling the reader anything useful — "pending · 143 d"
// reads as noise where "pending · 5 mo" reads as a problem.
export function pendingDelay(days: number): PendingDelay {
  if (days <= PENDING_MONTH_THRESHOLD_DAYS) return { unit: 'days', days }
  return { unit: 'months', months: Math.round(days / PENDING_MONTH_THRESHOLD_DAYS) }
}

export function isPendingOverAMonth(pendingDays: number | null): boolean {
  return pendingDays != null && pendingDays > PENDING_MONTH_THRESHOLD_DAYS
}

// A refused paper waits from the day of the refusal, not from the day it was sent: the
// submission that earned the rejection is over, what is running is the silence since.
export function pendingSince({
  status,
  submissions,
  lastSubmissionAt,
}: {
  status: string
  submissions: { decidedAt: Date | null }[]
  lastSubmissionAt: Date | null
}): Date | null {
  if (status !== 'TO_RESUBMIT') return lastSubmissionAt
  const decided = submissions.filter((submission) => submission.decidedAt !== null).at(-1)
  return decided?.decidedAt ?? lastSubmissionAt
}
