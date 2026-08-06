export type AuthorshipEntry = { authorId: string; isCorresponding: boolean }

export type AuthorshipPlan = {
  removeAuthorIds: string[]
  upserts: Array<{ authorId: string; order: number; isCorresponding: boolean }>
}

export function planAuthorshipChanges(currentAuthorIds: string[], desired: AuthorshipEntry[]): AuthorshipPlan {
  const seen = new Set<string>()
  const upserts: AuthorshipPlan['upserts'] = []
  for (const entry of desired) {
    if (seen.has(entry.authorId)) continue
    seen.add(entry.authorId)
    upserts.push({ authorId: entry.authorId, order: upserts.length + 1, isCorresponding: entry.isCorresponding })
  }
  return {
    removeAuthorIds: currentAuthorIds.filter((authorId) => !seen.has(authorId)),
    upserts,
  }
}

export function moveAuthorship<T>(entries: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (index < 0 || index >= entries.length || target < 0 || target >= entries.length) return entries
  const next = [...entries]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}
