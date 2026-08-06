import type { ArticleStatusValue } from '@/lib/services/publications/articles'
import type { ArticleTypeValue } from './article-type'
import type { MyPublicationSubmission } from '@/lib/services/publications/my-publications'
import { ARTICLE_STATUS_VALUES, POSITION_BUCKETS, authorPositionBucket, type PositionBucket } from './status-display'
import { matchesArticleQuery } from './admin-article-stats'
import { type ArticleScopeValue } from './article-scope'

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
  scope: ArticleScopeValue
  authors: { id: string; name: string; team: boolean }[]
  doi: string | null
  pdfUrl: string | null
  lastSubmissionAt: string | null
  acceptedAt: string | null
  pendingDays: number | null
  submissions: MyPublicationSubmission[]
}

export type DashboardFilters = {
  studies: string[]
  journals: string[]
  statuses: string[]
  scopes: string[]
  yearFrom: string
  yearTo: string
  author: string
  query: string
}

export const ALL_FILTER = 'all'
export const NO_STUDY_FILTER = 'none'
export const NO_JOURNAL_FILTER = 'none'

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  studies: [],
  journals: [],
  statuses: [],
  scopes: ['LARIB_TEAM'],
  yearFrom: ALL_FILTER,
  yearTo: ALL_FILTER,
  author: ALL_FILTER,
  query: '',
}

export function toggleFilterValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((current) => current !== value) : [...values, value]
}

export function articleStudyKey(article: DashboardArticleItem): string {
  return article.studyId ?? NO_STUDY_FILTER
}

export function articleJournalKey(article: DashboardArticleItem): string {
  return article.journal ?? NO_JOURNAL_FILTER
}

export function isYearActive(filters: DashboardFilters, year: number): boolean {
  if (filters.yearFrom === ALL_FILTER && filters.yearTo === ALL_FILTER) return false
  const from = filters.yearFrom === ALL_FILTER ? Number.NEGATIVE_INFINITY : Number(filters.yearFrom)
  const to = filters.yearTo === ALL_FILTER ? Number.POSITIVE_INFINITY : Number(filters.yearTo)
  return year >= from && year <= to
}

export function yearRangeBounds(
  filters: DashboardFilters,
  bounds: { min: number; max: number },
): [number, number] {
  const from = filters.yearFrom === ALL_FILTER ? bounds.min : Number(filters.yearFrom)
  const to = filters.yearTo === ALL_FILTER ? bounds.max : Number(filters.yearTo)
  return [Math.max(bounds.min, Math.min(from, to)), Math.min(bounds.max, Math.max(from, to))]
}

// Dragging the slider back to both ends means "every year", not a range.
export function yearSliderPatch(
  bounds: { min: number; max: number },
  [from, to]: [number, number],
): Partial<DashboardFilters> {
  if (from <= bounds.min && to >= bounds.max) return { yearFrom: ALL_FILTER, yearTo: ALL_FILTER }
  return { yearFrom: String(from), yearTo: String(to) }
}

// Clicking a year bar starts a range, extends it on either side, and clears it
// when the clicked year is already the only one selected.
export function yearRangePatch(filters: DashboardFilters, year: number): Partial<DashboardFilters> {
  const selected = String(year)
  if (filters.yearFrom === ALL_FILTER && filters.yearTo === ALL_FILTER)
    return { yearFrom: selected, yearTo: selected }
  if (filters.yearFrom === selected && filters.yearTo === selected)
    return { yearFrom: ALL_FILTER, yearTo: ALL_FILTER }
  if (filters.yearFrom !== ALL_FILTER && year < Number(filters.yearFrom)) return { yearFrom: selected }
  if (filters.yearTo !== ALL_FILTER && year > Number(filters.yearTo)) return { yearTo: selected }
  return { yearFrom: selected, yearTo: selected }
}

const IN_PROGRESS_STATUSES: ArticleStatusValue[] = ['IN_PREPARATION', 'UNDER_REVIEW', 'TO_RESUBMIT', 'ACCEPTED']

export type CoAuthorCount = { id: string; name: string; team: boolean; count: number }
export type CoAuthorScope = 'all' | 'team' | 'external'
export type YearCount = { year: number; count: number }
export type StatusCount = { status: ArticleStatusValue; count: number }
export type StudyCount = { id: string; label: string | null; count: number }
export type JournalCount = { id: string; label: string | null; count: number }

export type DashboardMetrics = {
  total: number
  publishedCount: number
  publishedShare: number
  inProgressCount: number
  coAuthorCount: number
  studyCount: number
  currentYearCount: number
  coAuthors: CoAuthorCount[]
  perYear: YearCount[]
  byStatus: StatusCount[]
  byStudy: StudyCount[]
  byJournal: JournalCount[]
}

export function filterDashboardArticles(
  articles: DashboardArticleItem[],
  filters: DashboardFilters,
): DashboardArticleItem[] {
  return articles.filter((article) => {
    if (filters.scopes.length > 0 && !filters.scopes.includes(article.scope)) return false
    if (filters.studies.length > 0 && !filters.studies.includes(articleStudyKey(article))) return false
    if (filters.journals.length > 0 && !filters.journals.includes(articleJournalKey(article))) return false
    if (filters.statuses.length > 0 && !filters.statuses.includes(article.status)) return false
    if (filters.yearFrom !== ALL_FILTER && (article.year == null || article.year < Number(filters.yearFrom)))
      return false
    if (filters.yearTo !== ALL_FILTER && (article.year == null || article.year > Number(filters.yearTo))) return false
    if (filters.author !== ALL_FILTER && !article.authors.some((author) => author.id === filters.author)) return false
    return matchesArticleQuery(article, filters.query)
  })
}

// 'all' is the absence of a scope filter, so only these two are offered as toggles.
export const CO_AUTHOR_SCOPE_OPTIONS: CoAuthorScope[] = ['team', 'external']

export function filterCoAuthors(coAuthors: CoAuthorCount[], scope: CoAuthorScope, query = ''): CoAuthorCount[] {
  const needle = query.trim().toLowerCase()
  return coAuthors.filter((coAuthor) => {
    if (scope !== 'all' && coAuthor.team !== (scope === 'team')) return false
    if (needle.length === 0) return true
    return needle
      .split(/\s+/)
      .every((part) => coAuthor.name.toLowerCase().split(/\s+/).some((word) => word.startsWith(part)))
  })
}

export type AuthorPositionCount = { bucket: PositionBucket; count: number }
export type AuthorFocus = { id: string; name: string; total: number; positions: AuthorPositionCount[] }

export function resolveFocusedAuthor(coAuthors: CoAuthorCount[], filters: DashboardFilters): string | null {
  if (filters.author !== ALL_FILTER) return filters.author
  const needle = filters.query.trim().toLowerCase()
  if (needle.length < 2) return null
  const matches = coAuthors.filter((coAuthor) => coAuthor.name.toLowerCase().includes(needle))
  return matches.length === 1 ? matches[0].id : null
}

export function authorFocus(articles: DashboardArticleItem[], authorId: string): AuthorFocus | null {
  const counts = new Map<PositionBucket, number>()
  let name = ''
  let total = 0

  for (const article of articles) {
    const index = article.authors.findIndex((author) => author.id === authorId)
    if (index < 0) continue
    name = article.authors[index].name
    total += 1
    const bucket = authorPositionBucket(index + 1, article.authors.length)
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
  }

  if (total === 0) return null
  return {
    id: authorId,
    name,
    total,
    positions: POSITION_BUCKETS.filter((bucket) => (counts.get(bucket) ?? 0) > 0).map((bucket) => ({
      bucket,
      count: counts.get(bucket) ?? 0,
    })),
  }
}

export function dashboardYearOptions(articles: DashboardArticleItem[]): number[] {
  const years = new Set<number>()
  for (const article of articles) {
    if (article.year != null) years.add(article.year)
  }
  return [...years].sort((first, second) => second - first)
}

export function computeDashboardMetrics(articles: DashboardArticleItem[], currentYear: number): DashboardMetrics {
  const authorProfiles = new Map<string, { name: string; team: boolean }>()
  const authorCounts = new Map<string, number>()
  const studyIds = new Set<string>()
  const studyCounts = new Map<string, { label: string | null; count: number }>()
  const journalCounts = new Map<string, { label: string | null; count: number }>()
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
    const studyKey = article.studyId ?? NO_STUDY_FILTER
    const study = studyCounts.get(studyKey)
    if (study) study.count += 1
    else studyCounts.set(studyKey, { label: article.studyId ? article.studyLabel : null, count: 1 })
    const journalKey = articleJournalKey(article)
    const journal = journalCounts.get(journalKey)
    if (journal) journal.count += 1
    else journalCounts.set(journalKey, { label: article.journal, count: 1 })
    if (article.year != null) yearCounts.set(article.year, (yearCounts.get(article.year) ?? 0) + 1)
    statusCounts.set(article.status, (statusCounts.get(article.status) ?? 0) + 1)
    for (const author of article.authors) {
      authorProfiles.set(author.id, { name: author.name, team: author.team })
      authorCounts.set(author.id, (authorCounts.get(author.id) ?? 0) + 1)
    }
  }

  const coAuthors: CoAuthorCount[] = [...authorCounts.entries()]
    .map(([id, count]) => ({
      id,
      name: authorProfiles.get(id)?.name ?? '',
      team: authorProfiles.get(id)?.team ?? false,
      count,
    }))
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name))

  const perYear: YearCount[] = []
  if (yearCounts.size > 0) {
    const knownYears = [...yearCounts.keys()]
    const maxYear = Math.max(...knownYears)
    const minYear = Math.min(...knownYears)
    for (let year = minYear; year <= maxYear; year += 1) perYear.push({ year, count: yearCounts.get(year) ?? 0 })
  }

  const byStatus: StatusCount[] = ARTICLE_STATUS_VALUES.filter((status) => (statusCounts.get(status) ?? 0) > 0).map(
    (status) => ({ status, count: statusCounts.get(status) ?? 0 }),
  )

  const byStudy: StudyCount[] = [...studyCounts.entries()]
    .map(([id, study]) => ({ id, label: study.label, count: study.count }))
    .sort((first, second) => {
      if (first.id === NO_STUDY_FILTER) return 1
      if (second.id === NO_STUDY_FILTER) return -1
      return second.count - first.count || (first.label ?? '').localeCompare(second.label ?? '')
    })

  const byJournal: JournalCount[] = [...journalCounts.entries()]
    .map(([id, journal]) => ({ id, label: journal.label, count: journal.count }))
    .sort((first, second) => {
      if (first.id === NO_JOURNAL_FILTER) return 1
      if (second.id === NO_JOURNAL_FILTER) return -1
      return second.count - first.count || (first.label ?? '').localeCompare(second.label ?? '')
    })

  return {
    total: articles.length,
    publishedCount,
    publishedShare: articles.length === 0 ? 0 : Math.round((publishedCount / articles.length) * 100),
    inProgressCount,
    coAuthorCount: authorCounts.size,
    studyCount: studyIds.size,
    currentYearCount,
    coAuthors,
    perYear,
    byStatus,
    byStudy,
    byJournal,
  }
}
