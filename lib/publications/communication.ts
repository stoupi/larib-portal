import type { ArticleStatusValue } from '@/lib/services/publications/articles'

export const COMMUNICATION_STATUSES: ArticleStatusValue[] = ['ACCEPTED', 'PUBLISHED']

export type CommunicationArticleItem = {
  id: string
  title: string
  journal: string | null
  status: ArticleStatusValue
  firstAuthorName: string | null
  authorNames: string[]
  acceptedAt: string | null
  carouselEmailSentAt: string | null
}

export const COMMUNICATION_TABS = ['pending', 'sent', 'all'] as const
export type CommunicationTab = (typeof COMMUNICATION_TABS)[number]

export const COMMUNICATION_SORT_KEYS = ['acceptedAt', 'title'] as const
export type CommunicationSortKey = (typeof COMMUNICATION_SORT_KEYS)[number]
export type CommunicationSort = { key: CommunicationSortKey; direction: 'asc' | 'desc' }

export const DEFAULT_COMMUNICATION_SORT: CommunicationSort = { key: 'acceptedAt', direction: 'desc' }

export function isCarouselEmailPending(article: CommunicationArticleItem): boolean {
  return article.carouselEmailSentAt === null
}

export function countPendingCommunications(articles: CommunicationArticleItem[]): number {
  return articles.filter(isCarouselEmailPending).length
}

export function communicationTabCounts(articles: CommunicationArticleItem[]): Record<CommunicationTab, number> {
  const pending = countPendingCommunications(articles)
  return { pending, sent: articles.length - pending, all: articles.length }
}

function matchesQuery(article: CommunicationArticleItem, needle: string): boolean {
  if (needle.length === 0) return true
  const haystack = [article.title, article.journal ?? '', ...article.authorNames].join(' ').toLowerCase()
  return needle.split(/\s+/).every((part) => haystack.includes(part))
}

export function filterCommunicationArticles(
  articles: CommunicationArticleItem[],
  tab: CommunicationTab,
  query: string,
): CommunicationArticleItem[] {
  const needle = query.trim().toLowerCase()
  return articles.filter((article) => {
    if (tab === 'pending' && !isCarouselEmailPending(article)) return false
    if (tab === 'sent' && isCarouselEmailPending(article)) return false
    return matchesQuery(article, needle)
  })
}

// Articles with no acceptance date on record stay at the bottom whichever way the
// column is sorted: they carry no information to rank.
export function sortCommunicationArticles(
  articles: CommunicationArticleItem[],
  sort: CommunicationSort,
): CommunicationArticleItem[] {
  const direction = sort.direction === 'asc' ? 1 : -1
  return [...articles].sort((first, second) => {
    if (sort.key === 'title') return first.title.localeCompare(second.title) * direction
    if (first.acceptedAt === null && second.acceptedAt === null) return first.title.localeCompare(second.title)
    if (first.acceptedAt === null) return 1
    if (second.acceptedAt === null) return -1
    return first.acceptedAt.localeCompare(second.acceptedAt) * direction
  })
}

export function nextCommunicationSort(current: CommunicationSort, key: CommunicationSortKey): CommunicationSort {
  if (current.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  return { key, direction: key === 'title' ? 'asc' : 'desc' }
}
