import type { PubmedAuthor } from '@/types/publications'

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function authorDedupeKey(author: PubmedAuthor): string {
  if (author.orcid) return `orcid:${author.orcid}`
  const initial = (author.initials ?? author.foreName ?? '').trim().charAt(0).toLowerCase()
  return `name:${normalizeName(author.lastName)}|${initial}`
}

export type AuthorMatchCandidate = {
  id: string
  firstName: string
  lastName: string
  initials: string | null
  orcid: string | null
}

export function authorFirstInitial(author: { initials?: string | null; foreName?: string | null; firstName?: string | null }): string {
  const source = author.initials ?? author.foreName ?? author.firstName ?? ''
  return normalizeName(source).charAt(0)
}

// PubMed records often carry an ORCID the stored author lacks: match on ORCID first,
// then fall back to last name + first initial so we enrich instead of duplicating.
export function pickAuthorMatch(
  candidates: AuthorMatchCandidate[],
  incoming: { lastName: string; initials?: string | null; foreName?: string | null; orcid?: string | null },
): AuthorMatchCandidate | null {
  if (incoming.orcid) {
    const sameOrcid = candidates.find((candidate) => candidate.orcid === incoming.orcid)
    if (sameOrcid) return sameOrcid
  }

  const lastName = normalizeName(incoming.lastName)
  const initial = authorFirstInitial(incoming)
  const byName = candidates.filter(
    (candidate) =>
      normalizeName(candidate.lastName) === lastName &&
      (initial === '' || authorFirstInitial(candidate) === '' || authorFirstInitial(candidate) === initial),
  )
  // An author already tied to another ORCID is somebody else.
  const compatible = byName.filter((candidate) => !candidate.orcid || !incoming.orcid || candidate.orcid === incoming.orcid)
  return compatible[0] ?? null
}
