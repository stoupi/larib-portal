'use client'

import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PublicationStats } from '@/lib/publications/stats'
import { ARTICLE_STATUS_TONE, TONE_DOT_HEX } from '@/lib/publications/status-display'
import { ARTICLE_TYPE_BAR_HEX } from '@/lib/publications/article-type'
import { Slider } from '@/components/ui/slider'
import {
  NO_YEAR_RANGE,
  hasYearRange,
  isYearActive,
  yearRangeBounds,
  yearRangePatch,
  yearSliderPatch,
} from '@/lib/publications/year-range'
import type { FiltersValue } from './publications-filters'
import { ClearFilterButton } from './admin-dashboard/clear-filter-button'
import { StatBar, StatSectionLabel } from './stat-bar'

export function PublicationsStats({
  stats,
  open,
  onToggle,
  filters,
  onFilter,
}: {
  stats: PublicationStats
  open: boolean
  onToggle: () => void
  filters: FiltersValue
  onFilter: (patch: Partial<FiltersValue>) => void
}) {
  const t = useTranslations('publications')
  const maxYear = Math.max(1, ...stats.perYear.map((entry) => entry.count))
  const maxStatus = Math.max(1, ...stats.byStatus.map((entry) => entry.count))
  const maxPosition = Math.max(1, ...stats.byPosition.map((entry) => entry.count))
  const maxJournal = Math.max(1, ...stats.byJournal.map((entry) => entry.count))
  const maxType = Math.max(1, ...stats.byType.map((entry) => entry.count))
  const coral = { className: 'bg-gradient-to-r from-coral-500 to-coral-600' }
  const navy = { className: 'bg-gradient-to-r from-navy-500 to-navy-600' }
  const toggle = (key: keyof FiltersValue, value: string) => () =>
    onFilter({ [key]: filters[key] === value ? 'all' : value })
  const years = stats.perYear.map((entry) => entry.year)
  const yearBounds = years.length > 1 ? { min: Math.min(...years), max: Math.max(...years) } : null
  const selectedYears = yearBounds ? yearRangeBounds(filters, yearBounds) : [0, 0]

  return (
    <div className="rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
      <div className={cn('flex items-center justify-between gap-3', open && 'mb-4')}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold leading-none tracking-tight text-text-primary tabular-nums">
            {stats.total}
          </span>
          <span className="text-[12.5px] font-semibold text-text-secondary">{t('myPub.stats.publications')}</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-bg-surface px-3 text-xs font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5"
        >
          {open ? t('myPub.stats.hide') : t('myPub.stats.show')}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} strokeWidth={2.4} />
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <StatSectionLabel>{t('myPub.stats.perYear')}</StatSectionLabel>
              {hasYearRange(filters) && (
                <ClearFilterButton
                  label={t('myPub.stats.clearYear')}
                  onClear={() => onFilter(NO_YEAR_RANGE)}
                />
              )}
            </div>
            {stats.perYear.length === 0 ? (
              <p className="mt-3 text-xs text-text-muted">{t('myPub.stats.noYear')}</p>
            ) : (
              <div className="mt-3 flex h-28 items-end gap-1">
                {stats.perYear.map((entry) => {
                  const active = isYearActive(filters, entry.year)
                  return (
                    <button
                      key={entry.year}
                      type="button"
                      aria-pressed={active}
                      aria-label={t('myPub.stats.yearBar', { count: entry.count, year: String(entry.year) })}
                      onClick={() => onFilter(yearRangePatch(filters, entry.year))}
                      className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 rounded-lg pb-0.5 transition hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <span className="text-xs font-extrabold text-text-primary tabular-nums">{entry.count}</span>
                      <span
                        className={cn(
                          'w-full max-w-[18px] rounded-t-md transition-colors',
                          active
                            ? 'bg-gradient-to-t from-coral-600 to-coral-400'
                            : 'bg-coral-100 dark:bg-coral-500/25',
                        )}
                        style={{ height: entry.count === 0 ? 3 : Math.round((entry.count / maxYear) * 84) }}
                      />
                      <span
                        className={cn(
                          'text-[11px] font-semibold tabular-nums',
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
                  aria-label={t('myPub.stats.yearRange')}
                  className="[&_[data-slot=slider-range]]:bg-coral-500 [&_[data-slot=slider-thumb]]:border-coral-500 [&_[data-slot=slider-thumb]]:size-4"
                />
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-secondary tabular-nums">
                  <span>{selectedYears[0]}</span>
                  <span>{selectedYears[1]}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <StatSectionLabel>{t('myPub.stats.byStatus')}</StatSectionLabel>
            <div className="mt-3 flex flex-col gap-2.5">
              {stats.byStatus.map((entry) => (
                <StatBar
                  key={entry.status}
                  label={t(`articles.status.${entry.status}`)}
                  count={entry.count}
                  pct={Math.round((entry.count / maxStatus) * 100)}
                  color={{ hex: TONE_DOT_HEX[ARTICLE_STATUS_TONE[entry.status]] }}
                  toggle={{ active: filters.status === entry.status, onClick: toggle('status', entry.status) }}
                />
              ))}
            </div>
          </div>

          <div>
            <StatSectionLabel>{t('myPub.stats.byPosition')}</StatSectionLabel>
            <div className="mt-3 flex flex-col gap-2.5">
              {stats.byPosition.map((entry) => (
                <StatBar
                  key={entry.bucket}
                  label={t(`myPub.position.${entry.bucket}`)}
                  count={entry.count}
                  pct={Math.round((entry.count / maxPosition) * 100)}
                  color={entry.count > 0 ? coral : {}}
                  toggle={{ active: filters.role === entry.bucket, onClick: toggle('role', entry.bucket) }}
                />
              ))}
            </div>
          </div>

          <div>
            <StatSectionLabel>{t('myPub.stats.byJournal')}</StatSectionLabel>
            <div className="mt-3 flex flex-col gap-2.5">
              {stats.byJournal.length === 0 ? (
                <p className="text-xs text-text-muted">{t('myPub.stats.noJournal')}</p>
              ) : (
                stats.byJournal.map((entry) => (
                  <StatBar
                    key={entry.journal}
                    label={entry.journal}
                    count={entry.count}
                    pct={Math.round((entry.count / maxJournal) * 100)}
                    color={navy}
                    toggle={{ active: filters.journal === entry.journal, onClick: toggle('journal', entry.journal) }}
                  />
                ))
              )}
            </div>
          </div>

          <div>
            <StatSectionLabel>{t('myPub.stats.byType')}</StatSectionLabel>
            <div className="mt-3 flex flex-col gap-2.5">
              {stats.byType.map((entry) => (
                <StatBar
                  key={entry.type}
                  label={t(`myPub.type.${entry.type}`)}
                  count={entry.count}
                  pct={Math.round((entry.count / maxType) * 100)}
                  color={{ hex: ARTICLE_TYPE_BAR_HEX[entry.type] }}
                  toggle={{ active: filters.type === entry.type, onClick: toggle('type', entry.type) }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
