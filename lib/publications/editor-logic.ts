import type { ArticleStatusValue } from '@/lib/services/publications/articles'

export function isDraftDeletable(title: string, status: ArticleStatusValue): boolean {
  return title.trim() === '' && status === 'IN_PREPARATION'
}

type RecipientCandidate = { email: string; role: 'ADMIN' | 'USER'; adminApplications: string[] }

// Author-list request emails go to super-admins and PUBLICATIONS app-admins only.
export function pickAuthorRequestRecipients(candidates: RecipientCandidate[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const candidate of candidates) {
    const isAdmin = candidate.role === 'ADMIN' || candidate.adminApplications.includes('PUBLICATIONS')
    if (!isAdmin || seen.has(candidate.email)) continue
    seen.add(candidate.email)
    result.push(candidate.email)
  }
  return result
}

export type IssueRecipients = { to: string[]; cc: string[]; firstAuthorReached: boolean }

// An error report goes to whoever can act on it: the first author, with the admins
// in copy. Until the author bank holds every address, the first author often has
// none — the admins then carry it alone, and the sender is told so.
export function pickIssueRecipients({
  firstAuthorEmail,
  adminEmails,
}: {
  firstAuthorEmail: string | null
  adminEmails: string[]
}): IssueRecipients {
  const admins = adminEmails.filter((email, index) => email && adminEmails.indexOf(email) === index)
  if (!firstAuthorEmail) return { to: admins, cc: [], firstAuthorReached: false }
  return {
    to: [firstAuthorEmail],
    cc: admins.filter((email) => email !== firstAuthorEmail),
    firstAuthorReached: true,
  }
}
