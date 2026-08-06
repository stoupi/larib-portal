import type { DashboardArticleItem } from './admin-dashboard'

export function matchesArticleQuery(article: DashboardArticleItem, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return (
    article.title.toLowerCase().includes(needle) ||
    (article.journal ?? '').toLowerCase().includes(needle) ||
    (article.studyLabel ?? '').toLowerCase().includes(needle) ||
    article.authors.some((author) => author.name.toLowerCase().includes(needle))
  )
}
