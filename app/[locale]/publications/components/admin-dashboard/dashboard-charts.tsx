'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ARTICLE_STATUS_TONE, TONE_DOT_HEX } from '@/lib/publications/status-display'
import {
  ALL_FILTER,
  CO_AUTHOR_SCOPE_OPTIONS,
  filterCoAuthors,
  isYearActive,
  toggleFilterValue,
  yearRangePatch,
  yearRangeBounds,
  yearSliderPatch,
} from '@/lib/publications/admin-dashboard'
import { Slider } from '@/components/ui/slider'
import { ClearFilterButton } from './clear-filter-button'
import type { CoAuthorScope, DashboardFilters, DashboardMetrics } from '@/lib/publications/admin-dashboard'

const AVATAR_CLASSES = [
  'bg-coral-50 text-coral-600 dark:bg-coral-500/15 dark:text-coral-300',
  'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
]

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-coral-600">{children}</h2>
}

function CardHeaderRow({
  title,
  clear,
}: {
  title: string
  clear: { label: string; onClear: () => void } | null
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <CardTitle>{title}</CardTitle>
      {clear && <ClearFilterButton label={clear.label} onClear={clear.onClear} />}
    </div>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-text-muted">{children}</p>
}

export function DashboardCharts({
  metrics,
  filters,
  onFilter,
  years,
}: {
  metrics: DashboardMetrics
  filters: DashboardFilters
  onFilter: (patch: Partial<DashboardFilters>) => void
  years: number[]
}) {
  const t = useTranslations('publications.adminHome.charts')
  const tStatus = useTranslations('publications.articles')
  const tFilters = useTranslations('publications.adminHome.filters')
  const [coAuthorScope, setCoAuthorScope] = useState<CoAuthorScope>('all')
  const [coAuthorQuery, setCoAuthorQuery] = useState('')
  const coAuthors = filterCoAuthors(metrics.coAuthors, coAuthorScope, coAuthorQuery)
  const maxYear = Math.max(1, ...metrics.perYear.map((entry) => entry.count))
  const statusTotal = metrics.byStatus.reduce((sum, entry) => sum + entry.count, 0)
  const yearBounds =
    years.length > 1 ? { min: Math.min(...years), max: Math.max(...years) } : null
  const selectedYears = yearBounds ? yearRangeBounds(filters, yearBounds) : [0, 0]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <section className="flex h-[296px] flex-col rounded-2xl border border-line bg-bg-surface p-4 shadow-elevation-xs">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t('byCoAuthor')}</CardTitle>
          {filters.author !== ALL_FILTER && (
            <ClearFilterButton label={tFilters('clearAuthor')} onClear={() => onFilter({ author: ALL_FILTER })} />
          )}
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <div className="flex flex-1 items-center gap-0.5 rounded-lg border border-line p-0.5">
            {CO_AUTHOR_SCOPE_OPTIONS.map((scope) => (
              <button
                key={scope}
                type="button"
                aria-pressed={coAuthorScope === scope}
                onClick={() => setCoAuthorScope(coAuthorScope === scope ? 'all' : scope)}
                className={cn(
                  'flex-1 rounded-md px-2 py-1 text-[11px] font-bold transition',
                  coAuthorScope === scope
                    ? 'bg-gradient-to-b from-coral-500 to-coral-600 text-white'
                    : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-white/5',
                )}
              >
                {t(`scope.${scope}`)}
              </button>
            ))}
          </div>
          {coAuthorScope !== 'all' && (
            <ClearFilterButton label={t('clearScope')} onClear={() => setCoAuthorScope('all')} />
          )}
        </div>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
          <input
            value={coAuthorQuery}
            onChange={(event) => setCoAuthorQuery(event.target.value)}
            placeholder={t('authorSearchPlaceholder')}
            aria-label={t('authorSearch')}
            className="h-8 w-full rounded-lg border border-line bg-bg-surface pl-8 pr-8 text-[12.5px] text-text-primary outline-none placeholder:text-text-placeholder focus:border-coral-400"
          />
          {coAuthorQuery && (
            <button
              type="button"
              aria-label={t('clearAuthorSearch')}
              onClick={() => setCoAuthorQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-text-muted transition hover:bg-gray-100 hover:text-text-primary dark:hover:bg-white/10"
            >
              <X className="size-3.5" strokeWidth={2.4} />
            </button>
          )}
        </div>
        {coAuthors.length === 0 ? (
          <EmptyHint>{t('noData')}</EmptyHint>
        ) : (
          <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-3">
            {coAuthors.map((coAuthor, index) => (
              <li key={coAuthor.id}>
                <button
                  type="button"
                  aria-pressed={filters.author === coAuthor.id}
                  onClick={() =>
                    onFilter({ author: filters.author === coAuthor.id ? ALL_FILTER : coAuthor.id })
                  }
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-1.5 py-0.5 text-left transition',
                    filters.author === coAuthor.id
                      ? 'bg-coral-50 dark:bg-coral-500/10'
                      : 'hover:bg-gray-50 dark:hover:bg-white/5',
                  )}
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10.5px] font-extrabold ${AVATAR_CLASSES[index % AVATAR_CLASSES.length]}`}
                  >
                    {initials(coAuthor.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary" title={coAuthor.name}>
                    {coAuthor.name}
                  </span>
                  <span className="w-8 shrink-0 pl-1.5 text-right text-[13px] font-bold text-text-primary tabular-nums">
                    {coAuthor.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex h-[296px] flex-col rounded-2xl border border-line bg-bg-surface p-4 shadow-elevation-xs">
        <CardHeaderRow
          title={t('byYear')}
          clear={
            filters.yearFrom !== ALL_FILTER || filters.yearTo !== ALL_FILTER
              ? { label: tFilters('clearYear'), onClear: () => onFilter({ yearFrom: ALL_FILTER, yearTo: ALL_FILTER }) }
              : null
          }
        />
        {metrics.perYear.length === 0 ? (
          <EmptyHint>{t('noData')}</EmptyHint>
        ) : (
          <div className="mt-4 flex min-h-0 flex-1 items-end justify-around gap-1">
            {metrics.perYear.map((entry) => {
              const active = isYearActive(filters, entry.year)
              return (
                <button
                  key={entry.year}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onFilter(yearRangePatch(filters, entry.year))}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 rounded-lg pb-1 transition hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <span className="text-[13px] font-bold text-text-primary tabular-nums">{entry.count}</span>
                  <span
                    className={cn(
                      'w-full max-w-[42px] rounded-t-lg transition-colors',
                      active ? 'bg-gradient-to-t from-coral-600 to-coral-400' : 'bg-coral-100 dark:bg-coral-500/25',
                    )}
                    style={{ height: entry.count === 0 ? 4 : Math.round((entry.count / maxYear) * 132) }}
                  />
                  <span
                    className={cn(
                      'text-[11px] tabular-nums',
                      active ? 'text-coral-600 dark:text-coral-300' : 'text-text-muted',
                    )}
                  >
                    {entry.year}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        {yearBounds && (
          <div className="mt-3 px-1.5">
            <Slider
              min={yearBounds.min}
              max={yearBounds.max}
              step={1}
              value={selectedYears}
              onValueChange={([from, to]) => onFilter(yearSliderPatch(yearBounds, [from, to]))}
              aria-label={t('yearRange')}
              className="[&_[data-slot=slider-range]]:bg-coral-500 [&_[data-slot=slider-thumb]]:border-coral-500 [&_[data-slot=slider-thumb]]:size-4"
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-secondary tabular-nums">
              <span>{selectedYears[0]}</span>
              <span>{selectedYears[1]}</span>
            </div>
          </div>
        )}
      </section>

      <section className="flex h-[296px] flex-col rounded-2xl border border-line bg-bg-surface p-4 shadow-elevation-xs">
        <CardHeaderRow
          title={t('byStudy')}
          clear={
            filters.studies.length > 0
              ? { label: tFilters('clearStudy'), onClear: () => onFilter({ studies: [] }) }
              : null
          }
        />
        {metrics.byStudy.length === 0 ? (
          <EmptyHint>{t('noData')}</EmptyHint>
        ) : (
          <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-2">
            {metrics.byStudy.map((entry) => {
              const active = filters.studies.includes(entry.id)
              const label = entry.label ?? tFilters('noStudy')
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onFilter({ studies: toggleFilterValue(filters.studies, entry.id) })}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition',
                      active ? 'bg-coral-50 dark:bg-coral-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5',
                    )}
                  >
                    <span
                      className={cn(
                        'size-2.5 shrink-0 rounded-full',
                        entry.label ? 'bg-coral-500' : 'bg-gray-300 dark:bg-white/25',
                      )}
                    />
                    <span className="flex-1 truncate text-[13px] text-text-primary" title={label}>
                      {label}
                    </span>
                    <span className="pl-2 text-[13px] font-bold text-text-primary tabular-nums">{entry.count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex h-[296px] flex-col rounded-2xl border border-line bg-bg-surface p-4 shadow-elevation-xs">
        <CardHeaderRow
          title={t('byJournal')}
          clear={
            filters.journals.length > 0
              ? { label: tFilters('clearJournal'), onClear: () => onFilter({ journals: [] }) }
              : null
          }
        />
        {metrics.byJournal.length === 0 ? (
          <EmptyHint>{t('noData')}</EmptyHint>
        ) : (
          <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-2">
            {metrics.byJournal.map((entry) => {
              const active = filters.journals.includes(entry.id)
              const label = entry.label ?? tFilters('noJournal')
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onFilter({ journals: toggleFilterValue(filters.journals, entry.id) })}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition',
                      active ? 'bg-coral-50 dark:bg-coral-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5',
                    )}
                  >
                    <span
                      className={cn(
                        'size-2.5 shrink-0 rounded-full',
                        entry.label ? 'bg-[#0EA5E9]' : 'bg-gray-300 dark:bg-white/25',
                      )}
                    />
                    <span className="flex-1 truncate text-[13px] text-text-primary" title={label}>
                      {label}
                    </span>
                    <span className="pl-2 text-[13px] font-bold text-text-primary tabular-nums">{entry.count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex h-[296px] flex-col rounded-2xl border border-line bg-bg-surface p-4 shadow-elevation-xs">
        <CardHeaderRow
          title={t('byStatus')}
          clear={
            filters.statuses.length > 0
              ? { label: tFilters('clearStatus'), onClear: () => onFilter({ statuses: [] }) }
              : null
          }
        />
        {metrics.byStatus.length === 0 ? (
          <EmptyHint>{t('noData')}</EmptyHint>
        ) : (
          <>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
              {metrics.byStatus.map((entry) => (
                <span
                  key={entry.status}
                  style={{
                    width: `${(entry.count / statusTotal) * 100}%`,
                    backgroundColor: TONE_DOT_HEX[ARTICLE_STATUS_TONE[entry.status]],
                  }}
                />
              ))}
            </div>
            <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-2">
              {metrics.byStatus.map((entry) => {
                const active = filters.statuses.includes(entry.status)
                return (
                  <li key={entry.status}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => onFilter({ statuses: toggleFilterValue(filters.statuses, entry.status) })}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition',
                        active ? 'bg-coral-50 dark:bg-coral-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5',
                      )}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: TONE_DOT_HEX[ARTICLE_STATUS_TONE[entry.status]] }}
                      />
                      <span className="flex-1 truncate text-[13px] text-text-primary">{tStatus(`status.${entry.status}`)}</span>
                      <span className="pl-2 text-[13px] font-bold text-text-primary tabular-nums">{entry.count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
