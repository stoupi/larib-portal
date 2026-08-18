import type { ArticleStatusValue } from '@/lib/services/publications/articles'

export const COMMUNICATION_STATUSES: ArticleStatusValue[] = ['ACCEPTED', 'PUBLISHED']

export type CommunicationArticleItem = {
  id: string
  title: string
  journal: string | null
  status: ArticleStatusValue
  firstAuthorName: string | null
  milestoneAt: string | null
  carouselEmailSentAt: string | null
}

export const COMMUNICATION_TABS = ['pending', 'sent', 'all'] as const
export type CommunicationTab = (typeof COMMUNICATION_TABS)[number]

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
  const haystack = [article.title, article.journal ?? '', article.firstAuthorName ?? ''].join(' ').toLowerCase()
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
