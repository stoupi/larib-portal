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
