import type { DashboardArticleItem } from './admin-dashboard'
import { ARTICLE_STATUS_VALUES } from './status-display'

export type ArticleSortKey = 'title' | 'journal' | 'study' | 'status' | 'submission'
export type SortDirection = 'asc' | 'desc'
export type ArticleSort = { key: ArticleSortKey; direction: SortDirection } | null

export const ARTICLE_SORT_KEYS: ArticleSortKey[] = ['title', 'journal', 'study', 'status', 'submission']

export function nextArticleSort(current: ArticleSort, key: ArticleSortKey): ArticleSort {
  if (!current || current.key !== key) return { key, direction: 'asc' }
  if (current.direction === 'asc') return { key, direction: 'desc' }
  return null
}

function textValue(article: DashboardArticleItem, key: ArticleSortKey): string | null {
  if (key === 'title') return article.title.trim() || null
  if (key === 'journal') return article.journal
  return article.studyLabel
}

function hasValue(article: DashboardArticleItem, key: ArticleSortKey): boolean {
  if (key === 'status') return true
  if (key === 'submission') return article.lastSubmissionAt != null
  return textValue(article, key) != null
}

function compareByKey(first: DashboardArticleItem, second: DashboardArticleItem, key: ArticleSortKey): number {
  if (key === 'status') {
    return ARTICLE_STATUS_VALUES.indexOf(first.status) - ARTICLE_STATUS_VALUES.indexOf(second.status)
  }
  if (key === 'submission') {
    return Date.parse(first.lastSubmissionAt ?? '') - Date.parse(second.lastSubmissionAt ?? '')
  }
  return (textValue(first, key) ?? '').localeCompare(textValue(second, key) ?? '', undefined, { sensitivity: 'base' })
}

export function sortArticles(articles: DashboardArticleItem[], sort: ArticleSort): DashboardArticleItem[] {
  if (!sort) return articles
  return [...articles].sort((first, second) => {
    const firstHasValue = hasValue(first, sort.key)
    const secondHasValue = hasValue(second, sort.key)
    if (!firstHasValue || !secondHasValue) return Number(secondHasValue) - Number(firstHasValue)
    const comparison = compareByKey(first, second, sort.key)
    return sort.direction === 'asc' ? comparison : -comparison
  })
}
