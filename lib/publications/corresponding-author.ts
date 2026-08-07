import type { AuthorshipEntry } from './author-list'

export function markCorresponding(entries: AuthorshipEntry[], authorId: string): AuthorshipEntry[] {
  if (!entries.some((entry) => entry.authorId === authorId)) return entries
  const wasCorresponding = entries.some(
    (entry) => entry.authorId === authorId && entry.isCorresponding,
  )
  return entries.map((entry) => ({
    ...entry,
    isCorresponding: !wasCorresponding && entry.authorId === authorId,
  }))
}
