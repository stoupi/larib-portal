import type { ArticleStatusValue } from '@/lib/services/publications/articles'
import type { Application } from '@/app/generated/prisma'
import { filterActiveAppAdmins, type AccessPeriodSummary } from '@/lib/permissions'

export function isDraftDeletable(title: string, status: ArticleStatusValue): boolean {
  return title.trim() === '' && status === 'IN_PREPARATION'
}

type RecipientCandidate = {
  email: string
  role: 'ADMIN' | 'USER'
  adminApplications: Application[]
  accessPeriods: AccessPeriodSummary[]
}

// Author-list request emails go to super-admins and PUBLICATIONS app-admins only.
export function pickAuthorRequestRecipients(
  candidates: RecipientCandidate[],
  now: Date = new Date(),
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const candidate of filterActiveAppAdmins(candidates, 'PUBLICATIONS', now)) {
    if (seen.has(candidate.email)) continue
    seen.add(candidate.email)
    result.push(candidate.email)
  }
  return result
}

export type IssueRecipients = { to: string[]; cc: string[]; firstAuthorReached: boolean }

// An error report goes to whoever can act on it: the first author, with the admins
// in copy. Two cases send it to the admins alone — the first author has no address
// on file, or they are the one reporting, and nobody writes to themselves.
export function pickIssueRecipients({
  firstAuthorEmail,
  reporterEmail,
  adminEmails,
}: {
  firstAuthorEmail: string | null
  reporterEmail: string | null
  adminEmails: string[]
}): IssueRecipients {
  const admins = adminEmails.filter((email, index) => email && adminEmails.indexOf(email) === index)
  if (!firstAuthorEmail || firstAuthorEmail === reporterEmail) {
    return { to: admins, cc: [], firstAuthorReached: false }
  }
  return {
    to: [firstAuthorEmail],
    cc: admins.filter((email) => email !== firstAuthorEmail),
    firstAuthorReached: true,
  }
}
