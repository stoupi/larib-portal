import type { MyPublicationItem } from '@/lib/services/publications/my-publications'
import type { ArticleStatusValue } from '@/lib/services/publications/articles'

export const RECAP_STATUSES = ['IN_PREPARATION', 'UNDER_REVIEW', 'REVISION', 'TO_RESUBMIT'] as const
export type RecapStatusValue = (typeof RECAP_STATUSES)[number]

export type RecapArticle = {
  id: string
  title: string
  status: RecapStatusValue
  journalName: string | null
  order: number
  totalAuthors: number
  isFirstAuthor: boolean
  // The day the publication entered its current state, and how long it has sat there.
  since: string | null
  waitingDays: number | null
}

export type RecapCelebration = {
  id: string
  title: string
  journalName: string | null
  acceptedAt: string
  isFirstAuthor: boolean
}

function isRecapStatus(status: ArticleStatusValue): status is RecapStatusValue {
  return RECAP_STATUSES.some((recapStatus) => recapStatus === status)
}

function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null
  const elapsed = now.getTime() - new Date(iso).getTime()
  return elapsed < 0 ? 0 : Math.floor(elapsed / 86_400_000)
}

// A rejected paper is dated by its refusal, not by the submission that earned it: what
// matters is how long it has been sitting unsent since.
function statusSince(publication: MyPublicationItem): string | null {
  if (publication.status === 'TO_RESUBMIT') {
    const decided = publication.submissions.filter((submission) => submission.decidedAt !== null).at(-1)
    return decided?.decidedAt ?? publication.lastSubmissionAt
  }
  if (publication.status === 'IN_PREPARATION') return null
  return publication.lastSubmissionAt
}

export function selectRecapArticles(
  publications: MyPublicationItem[],
  now: Date = new Date(),
): RecapArticle[] {
  return publications.flatMap((publication) => {
    if (!isRecapStatus(publication.status)) return []
    const since = statusSince(publication)
    return [
      {
        id: publication.id,
        title: publication.title,
        status: publication.status,
        journalName: publication.currentJournal,
        order: publication.order,
        totalAuthors: publication.totalAuthors,
        isFirstAuthor: publication.isFirst,
        since,
        waitingDays: daysSince(since, now),
      },
    ]
  })
}

// The papers nobody has sent back out. They are the whole point of the recap: a refusal
// that never turns into a new submission is how a finished piece of work quietly dies.
export function selectStalledArticles(articles: RecapArticle[]): RecapArticle[] {
  return articles
    .filter((article) => article.status === 'TO_RESUBMIT')
    .sort((first, second) => (second.waitingDays ?? 0) - (first.waitingDays ?? 0))
}

export function selectOngoingArticles(articles: RecapArticle[]): RecapArticle[] {
  return articles
    .filter((article) => article.status !== 'TO_RESUBMIT')
    .sort((first, second) => {
      if (first.isFirstAuthor !== second.isFirstAuthor) return first.isFirstAuthor ? -1 : 1
      return (second.waitingDays ?? -1) - (first.waitingDays ?? -1)
    })
}

// Only what the journal accepted since the last recap is worth celebrating; an older
// acceptance was already announced a month ago.
export function selectRecapCelebrations(
  publications: MyPublicationItem[],
  since: Date,
): RecapCelebration[] {
  return publications
    .flatMap((publication) => {
      if (publication.status !== 'ACCEPTED' && publication.status !== 'PUBLISHED') return []
      if (!publication.acceptedAt || new Date(publication.acceptedAt) < since) return []
      return [
        {
          id: publication.id,
          title: publication.title,
          journalName: publication.currentJournal,
          acceptedAt: publication.acceptedAt,
          isFirstAuthor: publication.isFirst,
        },
      ]
    })
    .sort((first, second) => {
      if (first.isFirstAuthor !== second.isFirstAuthor) return first.isFirstAuthor ? -1 : 1
      return second.acceptedAt.localeCompare(first.acceptedAt)
    })
}

export function previousMonthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
}
