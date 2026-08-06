export type DuplicateEntry = { id: string; label: string; key: string }

export type DuplicateGroup = { key: string; members: DuplicateEntry[] }

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function authorDuplicateKey(author: { firstName: string; lastName: string }): string {
  const initial = normalize(author.firstName).charAt(0)
  return `${normalize(author.lastName)}|${initial}`
}

// Journals differ mostly by punctuation and abbreviation spacing, so the ISSN wins when known.
export function journalDuplicateKey(journal: { name: string; issn: string | null }): string {
  if (journal.issn) return `issn:${journal.issn.replace(/[^0-9xX]/g, '').toLowerCase()}`
  return `name:${normalize(journal.name).replace(/\s+/g, '')}`
}

export function duplicateGroups(entries: DuplicateEntry[]): DuplicateGroup[] {
  const byKey = new Map<string, DuplicateEntry[]>()
  for (const entry of entries) {
    const members = byKey.get(entry.key) ?? []
    members.push(entry)
    byKey.set(entry.key, members)
  }
  return [...byKey.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([key, members]) => ({ key, members }))
    .sort((first, second) => second.members.length - first.members.length)
}
