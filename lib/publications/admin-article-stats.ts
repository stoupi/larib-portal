import type { ArticleStatusValue } from '@/lib/services/publications/articles'
import type { DashboardArticleItem } from './admin-dashboard'
import { ARTICLE_TYPE_VALUES, type ArticleTypeValue } from './article-type'
import { ARTICLE_STATUS_VALUES, articleGroup, type ArticleGroup } from './status-display'

export type YearCount = { year: number; count: number }
export type StatusCount = { status: ArticleStatusValue; count: number }
export type StudyCount = { study: string; count: number }
export type JournalCount = { journal: string; count: number }
export type TypeCount = { type: ArticleTypeValue; count: number }

export type AdminArticleStats = {
  total: number
  pending: number
  perYear: YearCount[]
  byStatus: StatusCount[]
  byStudy: StudyCount[]
  byJournal: JournalCount[]
  byType: TypeCount[]
}

export type AdminArticleFilters = {
  status: string
  study: string
  journal: string
  type: string
}

export type AdminArticleGroup = 'all' | ArticleGroup

export const ALL_ADMIN_FILTER = 'all'
export const NO_STUDY_FILTER = '__none__'

export const DEFAULT_ADMIN_ARTICLE_FILTERS: AdminArticleFilters = {
  status: ALL_ADMIN_FILTER,
  study: ALL_ADMIN_FILTER,
  journal: ALL_ADMIN_FILTER,
  type: ALL_ADMIN_FILTER,
}

export const ADMIN_ARTICLE_TABS: AdminArticleGroup[] = ['all', 'inProgress', 'draft', 'published']

const MAX_YEAR_BARS = 8
const TOP_STUDIES = 6
const TOP_JOURNALS = 6

export function adminArticleFiltersActive(filters: AdminArticleFilters): boolean {
  return (
    filters.status !== ALL_ADMIN_FILTER ||
    filters.study !== ALL_ADMIN_FILTER ||
    filters.journal !== ALL_ADMIN_FILTER ||
    filters.type !== ALL_ADMIN_FILTER
  )
}

function matchesQuery(article: DashboardArticleItem, needle: string): boolean {
  if (!needle) return true
  return (
    article.title.toLowerCase().includes(needle) ||
    (article.journal ?? '').toLowerCase().includes(needle) ||
    (article.studyLabel ?? '').toLowerCase().includes(needle) ||
    article.authors.some((author) => author.name.toLowerCase().includes(needle))
  )
}

export function filterAdminArticles(
  articles: DashboardArticleItem[],
  filters: AdminArticleFilters,
  group: AdminArticleGroup,
  query: string,
): DashboardArticleItem[] {
  const needle = query.trim().toLowerCase()
  return articles.filter((article) => {
    if (group !== 'all' && articleGroup(article.status) !== group) return false
    if (filters.status !== ALL_ADMIN_FILTER && article.status !== filters.status) return false
    if (filters.type !== ALL_ADMIN_FILTER && article.type !== filters.type) return false
    if (filters.journal !== ALL_ADMIN_FILTER && article.journal !== filters.journal) return false
    if (filters.study !== ALL_ADMIN_FILTER) {
      if (filters.study === NO_STUDY_FILTER ? article.studyLabel != null : article.studyLabel !== filters.study)
        return false
    }
    return matchesQuery(article, needle)
  })
}

export function adminArticleGroupCounts(articles: DashboardArticleItem[]): Record<AdminArticleGroup, number> {
  const counts: Record<AdminArticleGroup, number> = {
    all: articles.length,
    inProgress: 0,
    draft: 0,
    published: 0,
    other: 0,
  }
  for (const article of articles) counts[articleGroup(article.status)] += 1
  return counts
}

export function adminStudyOptions(articles: DashboardArticleItem[]): string[] {
  return [...new Set(articles.map((article) => article.studyLabel).filter((label): label is string => label != null))].sort(
    (first, second) => first.localeCompare(second),
  )
}

export function adminJournalOptions(articles: DashboardArticleItem[]): string[] {
  return [...new Set(articles.map((article) => article.journal).filter((name): name is string => name != null))].sort(
    (first, second) => first.localeCompare(second),
  )
}

function topCounts(values: (string | null)[], limit: number): { key: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((first, second) => second.count - first.count || first.key.localeCompare(second.key))
    .slice(0, limit)
}

export function computeAdminArticleStats(articles: DashboardArticleItem[]): AdminArticleStats {
  const years = articles.map((article) => article.year).filter((year): year is number => year != null)

  const perYear: YearCount[] = []
  if (years.length > 0) {
    const maxYear = Math.max(...years)
    const minYear = Math.min(...years)
    const startYear = maxYear - minYear + 1 > MAX_YEAR_BARS ? maxYear - MAX_YEAR_BARS + 1 : minYear
    const counts = new Map<number, number>()
    for (const year of years) counts.set(year, (counts.get(year) ?? 0) + 1)
    for (let year = startYear; year <= maxYear; year += 1) perYear.push({ year, count: counts.get(year) ?? 0 })
  }

  const statusCounts = new Map<ArticleStatusValue, number>()
  for (const article of articles) statusCounts.set(article.status, (statusCounts.get(article.status) ?? 0) + 1)

  const typeCounts = new Map<ArticleTypeValue, number>()
  for (const article of articles) typeCounts.set(article.type, (typeCounts.get(article.type) ?? 0) + 1)

  return {
    total: articles.length,
    pending: articles.length - years.length,
    perYear,
    byStatus: ARTICLE_STATUS_VALUES.filter((status) => (statusCounts.get(status) ?? 0) > 0).map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    })),
    byStudy: topCounts(
      articles.map((article) => article.studyLabel),
      TOP_STUDIES,
    ).map((entry) => ({ study: entry.key, count: entry.count })),
    byJournal: topCounts(
      articles.map((article) => article.journal),
      TOP_JOURNALS,
    ).map((entry) => ({ journal: entry.key, count: entry.count })),
    byType: ARTICLE_TYPE_VALUES.filter((type) => (typeCounts.get(type) ?? 0) > 0).map((type) => ({
      type,
      count: typeCounts.get(type) ?? 0,
    })),
  }
}
