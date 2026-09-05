export type ReminderKind = 'READING' | 'REVIEW' | 'CALIBRATION' | 'TRAINING'

export type ReminderItem = {
  userId: string
  kind: ReminderKind
  entityId: string
  label: string
  dueDate: Date | null
}

export type ReminderGroup = { userId: string; items: ReminderItem[] }

const DAY = 24 * 60 * 60 * 1000

export function reminderKey(item: Pick<ReminderItem, 'userId' | 'kind' | 'entityId'>): string {
  return `${item.userId}|${item.kind}|${item.entityId}`
}

// Seven days before, on the day, then once a week while it stays late.
export function shouldRemind(dueDate: Date | null, now: Date): boolean {
  if (!dueDate) return false
  const days = Math.round((dueDate.getTime() - now.setUTCHours(0, 0, 0, 0)) / DAY)
  if (days === 7 || days === 0) return true
  return days < 0 && days % 7 === 0
}

export function dueReminders(items: ReminderItem[], alreadySent: Set<string>, now: Date): ReminderGroup[] {
  const grouped = new Map<string, ReminderItem[]>()
  for (const item of items) {
    if (alreadySent.has(reminderKey(item))) continue
    if (!shouldRemind(item.dueDate, new Date(now))) continue
    grouped.set(item.userId, [...(grouped.get(item.userId) ?? []), item])
  }
  return [...grouped.entries()].map(([userId, userItems]) => ({ userId, items: userItems }))
}

export function lateItems(items: ReminderItem[], now: Date): ReminderItem[] {
  return items.filter((item) => item.dueDate !== null && item.dueDate.getTime() < now.getTime())
}
