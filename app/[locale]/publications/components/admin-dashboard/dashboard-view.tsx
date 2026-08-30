'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Clock, Search, X } from 'lucide-react'
import { MultiSelect } from '@/components/ui/multiselect'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ScopeToggleFace } from '../articles/article-scope-switch'
import { ARTICLE_TYPE_VALUES } from '@/lib/publications/article-type'
import {
  ALL_FILTER,
  NO_STUDY_FILTER,
  DEFAULT_DASHBOARD_FILTERS,
  authorFocus,
  authorPositionPatch,
  computeDashboardMetrics,
  dashboardYearOptions,
  filterDashboardArticles,
  resolveFocusedAuthor,
  type DashboardArticleItem,
  type DashboardFilters,
} from '@/lib/publications/admin-dashboard'
import { DashboardKpis } from './dashboard-kpis'
import { DashboardCharts } from './dashboard-charts'
import { DashboardAuthorFocus } from './dashboard-author-focus'
import { DashboardArticlesCard } from './dashboard-articles-card'
import { useUrlDashboardFilters } from './use-url-filters'
import { AdminAuthorRequests } from '../admin-author-requests'
import { NewPublicationButton } from '../new-publication-button'
import { PubmedImportDialog } from '../pubmed-import/pubmed-import-dialog'
import { PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import type { PendingAuthorRequest } from '@/lib/services/publications/author-requests'
import type { StudyOption } from '@/lib/services/publications/studies'



export function PublicationsDashboardView({
  articles,
  studies,
  authorRequests,
  journals,
  locale,
}: {
  articles: DashboardArticleItem[]
  studies: StudyOption[]
  authorRequests: PendingAuthorRequest[]
  journals: { names: string[]; currentYear: number }
  locale: string
}) {
  const t = useTranslations('publications.adminHome')
  const tArticles = useTranslations('publications.articles')
  const tMyPub = useTranslations('publications.myPub')
  const { filters, updateFilter, clearFilters } = useUrlDashboardFilters()
  const [overviewOpen, setOverviewOpen] = useState(true)

  const years = useMemo(() => dashboardYearOptions(articles), [articles])
  const filtered = useMemo(() => filterDashboardArticles(articles, filters), [articles, filters])
  const metrics = useMemo(() => computeDashboardMetrics(filtered, journals.currentYear), [filtered, journals.currentYear])
  // The tiles keep showing every rank of the focused author, even while one rank filters the list.
  const filteredWithoutPosition = useMemo(
    () => filterDashboardArticles(articles, { ...filters, authorPosition: ALL_FILTER }),
    [articles, filters],
  )
  const focus = useMemo(() => {
    const focusedAuthorId = resolveFocusedAuthor(metrics.coAuthors, filters)
    return focusedAuthorId ? authorFocus(filteredWithoutPosition, focusedAuthorId) : null
  }, [metrics.coAuthors, filters, filteredWithoutPosition])

  const teamOnly = filters.scopes.length === 1 && filters.scopes[0] === 'LARIB_TEAM'

  const hasActiveFilters =
    filters.query.trim() !== '' ||
    filters.studies.length > 0 ||
    filters.statuses.length > 0 ||
    filters.types.length > 0 ||
    filters.yearFrom !== ALL_FILTER ||
    filters.yearTo !== ALL_FILTER ||
    filters.author !== ALL_FILTER ||
    filters.authorPosition !== ALL_FILTER ||
    filters.pendingOverMonth ||
    filters.scopes.join() !== DEFAULT_DASHBOARD_FILTERS.scopes.join()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-stretch justify-between gap-3.5">
        <div className="flex items-stretch gap-3.5">
          <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('title')}</h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-text-secondary">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <PubmedImportDialog target={{ mode: 'create' }} basePath={PUBLICATIONS_ADMIN_BASE} canImportAnyone />
          <NewPublicationButton asAdmin />
        </div>
      </header>

      <section className="space-y-3 rounded-2xl border border-line bg-bg-surface p-3 shadow-elevation-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[280px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={filters.query}
              onChange={(event) => updateFilter({ query: event.target.value })}
              placeholder={t('filters.searchPlaceholder')}
              aria-label={t('filters.search')}
              className="h-9 rounded-full bg-gray-50 pl-9 pr-9 text-sm dark:bg-white/10"
            />
            {filters.query && (
              <button
                type="button"
                aria-label={t('filters.clearSearch')}
                onClick={() => updateFilter({ query: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-coral-600 transition hover:bg-coral-50 dark:hover:bg-white/10"
              >
                <X className="size-3.5" strokeWidth={2.6} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <MultiSelect
              options={[
                { label: t('filters.noStudy'), value: NO_STUDY_FILTER },
                ...studies.map((study) => ({ label: study.label, value: study.id })),
              ]}
              defaultValue={filters.studies}
              onValueChange={(values) => updateFilter({ studies: values })}
              placeholder={t('filters.allStudies')}
              aria-label={t('filters.study')}
              maxCount={1}
              className="h-9 min-w-[168px] rounded-full border-line bg-gray-50 dark:bg-white/10"
            />
          </div>

          <div className="flex items-center gap-2">
            <MultiSelect
              options={ARTICLE_TYPE_VALUES.map((type) => ({
                label: tMyPub(`type.${type}`),
                value: type,
              }))}
              defaultValue={filters.types}
              onValueChange={(values) => updateFilter({ types: values })}
              placeholder={t('filters.allTypes')}
              aria-label={t('filters.type')}
              maxCount={1}
              className="h-9 min-w-[168px] rounded-full border-line bg-gray-50 dark:bg-white/10"
            />
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-pressed={filters.pendingOverMonth}
                onClick={() => updateFilter({ pendingOverMonth: !filters.pendingOverMonth })}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold transition',
                  filters.pendingOverMonth
                    ? 'border-[#FDBA74] bg-[#FFF3E9] text-[#EA580C] dark:border-[rgba(234,88,12,0.32)] dark:bg-[rgba(234,88,12,0.16)] dark:text-[#FDBA74]'
                    : 'border-line bg-gray-50 text-text-secondary hover:bg-gray-100 dark:bg-white/10 dark:hover:bg-white/15',
                )}
              >
                <Clock className="size-3.5" strokeWidth={2.4} />
                {t('filters.pendingOverMonth')}
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('filters.pendingOverMonthHint')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-pressed={teamOnly}
                aria-label={t('filters.teamOnly')}
                onClick={() => updateFilter({ scopes: teamOnly ? [] : ['LARIB_TEAM'] })}
                className="inline-flex shrink-0"
              >
                <ScopeToggleFace
                  checked={teamOnly}
                  size="sm"
                  layout="inline"
                  label={teamOnly ? tArticles('scopeShortLabel') : t('filters.all')}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('filters.teamOnly')}</TooltipContent>
          </Tooltip>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-coral-200 bg-coral-50 px-3.5 text-[13px] font-bold text-coral-600 transition hover:brightness-95 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300"
            >
              <X className="size-3.5" strokeWidth={2.6} />
              {t('filters.clearAll')}
            </button>
          )}

          <button
            type="button"
            onClick={() => setOverviewOpen((open) => !open)}
            aria-expanded={overviewOpen}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5',
              !hasActiveFilters && 'ml-auto',
            )}
          >
            <ChevronDown className={cn('size-4 transition-transform', !overviewOpen && '-rotate-90')} />
            {overviewOpen ? t('overview.hide') : t('overview.show')}
          </button>
        </div>

        {overviewOpen && (
          <div className="space-y-3">
            <DashboardKpis metrics={metrics} />
            <DashboardCharts metrics={metrics} filters={filters} onFilter={updateFilter} years={years} />
            {focus && (
              <DashboardAuthorFocus
                focus={focus}
                activePosition={filters.authorPosition}
                onSelectPosition={(bucket) => updateFilter(authorPositionPatch(filters, focus.id, bucket))}
                onClear={
                  filters.author === ALL_FILTER
                    ? null
                    : () => updateFilter({ author: ALL_FILTER, authorPosition: ALL_FILTER })
                }
              />
            )}
          </div>
        )}
      </section>

      <AdminAuthorRequests requests={authorRequests} />

      <DashboardArticlesCard
        articles={filtered}
        locale={locale}
        journalNames={journals.names}
        studyOptions={studies}
      />
    </div>
  )
}
