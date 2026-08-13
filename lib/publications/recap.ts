import type { MyPublicationItem } from '@/lib/services/publications/my-publications'
import type { ArticleStatusValue } from '@/lib/services/publications/articles'

export const RECAP_STATUSES = ['IN_PREPARATION', 'UNDER_REVIEW', 'TO_RESUBMIT'] as const
export type RecapStatusValue = (typeof RECAP_STATUSES)[number]

export type RecapArticle = {
  id: string
  title: string
  status: RecapStatusValue
  journalName: string | null
  order: number
  totalAuthors: number
}

function isRecapStatus(status: ArticleStatusValue): status is RecapStatusValue {
  return RECAP_STATUSES.some((recapStatus) => recapStatus === status)
}

export function selectRecapArticles(publications: MyPublicationItem[]): RecapArticle[] {
  return publications.flatMap((publication) =>
    isRecapStatus(publication.status)
      ? [
          {
            id: publication.id,
            title: publication.title,
            status: publication.status,
            journalName: publication.currentJournal,
            order: publication.order,
            totalAuthors: publication.totalAuthors,
          },
        ]
      : [],
  )
}
