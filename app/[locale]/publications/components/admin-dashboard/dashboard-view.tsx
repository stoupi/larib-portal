'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Search } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ARTICLE_STATUS_VALUES } from '@/lib/publications/status-display'
import {
  ALL_FILTER,
  DEFAULT_DASHBOARD_FILTERS,
  computeDashboardMetrics,
  dashboardYearOptions,
  filterDashboardArticles,
  type DashboardArticleItem,
  type DashboardFilters,
} from '@/lib/publications/admin-dashboard'
import { DashboardKpis } from './dashboard-kpis'
import { DashboardCharts } from './dashboard-charts'
import { DashboardArticlesCard } from './dashboard-articles-card'
import { DashboardModules, type ModuleCounts } from './dashboard-modules'
import type { StudyOption } from '@/lib/services/publications/studies'

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="shrink-0 text-sm font-semibold text-text-secondary">
        {label}
      </label>
      <span className="relative block w-[132px]">
        <Select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full appearance-none truncate rounded-full border-line bg-gray-50 pl-3.5 pr-9 text-sm font-bold leading-none text-text-primary dark:bg-white/10"
        >
          {children}
        </Select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
        />
      </span>
    </div>
  )
}

export function PublicationsDashboardView({
  articles,
  studies,
  moduleCounts,
  journals,
  locale,
}: {
  articles: DashboardArticleItem[]
  studies: StudyOption[]
  moduleCounts: ModuleCounts
  journals: { names: string[]; currentYear: number }
  locale: string
}) {
  const t = useTranslations('publications.adminHome')
  const tArticles = useTranslations('publications.articles')
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS)

  const years = useMemo(() => dashboardYearOptions(articles), [articles])
  const filtered = useMemo(() => filterDashboardArticles(articles, filters), [articles, filters])
  const metrics = useMemo(() => computeDashboardMetrics(filtered, journals.currentYear), [filtered, journals.currentYear])

  function updateFilter(patch: Partial<DashboardFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-stretch gap-3.5">
          <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('title')}</h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-text-secondary">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-bg-surface px-4 py-3 shadow-elevation-xs">
          <div className="relative w-[240px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={filters.query}
              onChange={(event) => updateFilter({ query: event.target.value })}
              placeholder={t('filters.searchPlaceholder')}
              aria-label={t('filters.search')}
              className="h-9 rounded-full bg-gray-50 pl-9 text-sm dark:bg-white/10"
            />
          </div>
          <FilterSelect id="dashboard-filter-study" label={t('filters.study')} value={filters.study} onChange={(study) => updateFilter({ study })}>
            <option value={ALL_FILTER}>{t('filters.all')}</option>
            {studies.map((study) => (
              <option key={study.id} value={study.id}>
                {study.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect id="dashboard-filter-year" label={t('filters.year')} value={filters.year} onChange={(year) => updateFilter({ year })}>
            <option value={ALL_FILTER}>{t('filters.all')}</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect id="dashboard-filter-status" label={t('filters.status')} value={filters.status} onChange={(status) => updateFilter({ status })}>
            <option value={ALL_FILTER}>{t('filters.all')}</option>
            {ARTICLE_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {tArticles(`status.${status}`)}
              </option>
            ))}
          </FilterSelect>
        </div>
      </header>

      <DashboardKpis metrics={metrics} />
      <DashboardCharts metrics={metrics} />
      <DashboardArticlesCard articles={filtered} locale={locale} journalNames={journals.names} />
      <DashboardModules counts={moduleCounts} />
    </div>
  )
}
