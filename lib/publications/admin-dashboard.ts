import type { ArticleStatusValue } from '@/lib/services/publications/articles'
import type { ArticleTypeValue } from './article-type'
import type { MyPublicationSubmission } from '@/lib/services/publications/my-publications'
import { ARTICLE_STATUS_VALUES } from './status-display'

export type DashboardArticleItem = {
  id: string
  title: string
  type: ArticleTypeValue
  journal: string | null
  journalFull: string | null
  year: number | null
  studyId: string | null
  studyLabel: string | null
  status: ArticleStatusValue
  authors: { id: string; name: string }[]
  doi: string | null
  pdfUrl: string | null
  lastSubmissionAt: string | null
  acceptedAt: string | null
  pendingDays: number | null
  submissions: MyPublicationSubmission[]
}

export type DashboardFilters = {
  study: string
  year: string
  status: string
}

export const ALL_FILTER = 'all'

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  study: ALL_FILTER,
  year: ALL_FILTER,
  status: ALL_FILTER,
}

const IN_PROGRESS_STATUSES: ArticleStatusValue[] = ['IN_PREPARATION', 'UNDER_REVIEW', 'TO_RESUBMIT', 'ACCEPTED']
const TOP_CO_AUTHORS = 5
const MAX_YEAR_BARS = 6

export type CoAuthorCount = { id: string; name: string; count: number }
export type YearCount = { year: number; count: number }
export type StatusCount = { status: ArticleStatusValue; count: number }

export type DashboardMetrics = {
  total: number
  publishedCount: number
  publishedShare: number
  inProgressCount: number
  coAuthorCount: number
  studyCount: number
  currentYearCount: number
  topCoAuthors: CoAuthorCount[]
  perYear: YearCount[]
  byStatus: StatusCount[]
}

export function filterDashboardArticles(
  articles: DashboardArticleItem[],
  filters: DashboardFilters,
): DashboardArticleItem[] {
  return articles.filter((article) => {
    if (filters.study !== ALL_FILTER && article.studyId !== filters.study) return false
    if (filters.year !== ALL_FILTER && String(article.year ?? '') !== filters.year) return false
    if (filters.status !== ALL_FILTER && article.status !== filters.status) return false
    return true
  })
}

export function dashboardYearOptions(articles: DashboardArticleItem[]): number[] {
  const years = new Set<number>()
  for (const article of articles) {
    if (article.year != null) years.add(article.year)
  }
  return [...years].sort((first, second) => second - first)
}

export function computeDashboardMetrics(articles: DashboardArticleItem[], currentYear: number): DashboardMetrics {
  const authorNames = new Map<string, string>()
  const authorCounts = new Map<string, number>()
  const studyIds = new Set<string>()
  const yearCounts = new Map<number, number>()
  const statusCounts = new Map<ArticleStatusValue, number>()
  let publishedCount = 0
  let inProgressCount = 0
  let currentYearCount = 0

  for (const article of articles) {
    if (article.status === 'PUBLISHED') publishedCount += 1
    if (IN_PROGRESS_STATUSES.includes(article.status)) inProgressCount += 1
    if (article.year === currentYear) currentYearCount += 1
    if (article.studyId) studyIds.add(article.studyId)
    if (article.year != null) yearCounts.set(article.year, (yearCounts.get(article.year) ?? 0) + 1)
    statusCounts.set(article.status, (statusCounts.get(article.status) ?? 0) + 1)
    for (const author of article.authors) {
      authorNames.set(author.id, author.name)
      authorCounts.set(author.id, (authorCounts.get(author.id) ?? 0) + 1)
    }
  }

  const topCoAuthors: CoAuthorCount[] = [...authorCounts.entries()]
    .map(([id, count]) => ({ id, name: authorNames.get(id) ?? '', count }))
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name))
    .slice(0, TOP_CO_AUTHORS)

  const perYear: YearCount[] = []
  if (yearCounts.size > 0) {
    const knownYears = [...yearCounts.keys()]
    const maxYear = Math.max(...knownYears)
    const minYear = Math.min(...knownYears)
    const startYear = maxYear - minYear + 1 > MAX_YEAR_BARS ? maxYear - MAX_YEAR_BARS + 1 : minYear
    for (let year = startYear; year <= maxYear; year += 1) perYear.push({ year, count: yearCounts.get(year) ?? 0 })
  }

  const byStatus: StatusCount[] = ARTICLE_STATUS_VALUES.filter((status) => (statusCounts.get(status) ?? 0) > 0).map(
    (status) => ({ status, count: statusCounts.get(status) ?? 0 }),
  )

  return {
    total: articles.length,
    publishedCount,
    publishedShare: articles.length === 0 ? 0 : Math.round((publishedCount / articles.length) * 100),
    inProgressCount,
    coAuthorCount: authorCounts.size,
    studyCount: studyIds.size,
    currentYearCount,
    topCoAuthors,
    perYear,
    byStatus,
  }
}
