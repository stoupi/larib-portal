'use client'

import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ARTICLE_STATUS_TONE, TONE_DOT_HEX } from '@/lib/publications/status-display'
import { ARTICLE_TYPE_BAR_HEX } from '@/lib/publications/article-type'
import {
  ALL_ADMIN_FILTER,
  type AdminArticleFilters,
  type AdminArticleStats,
} from '@/lib/publications/admin-article-stats'
import { StatBar, StatSectionLabel } from '../stat-bar'

const CORAL_BAR = { className: 'bg-gradient-to-r from-coral-500 to-coral-600' }
const NAVY_BAR = { className: 'bg-gradient-to-r from-navy-500 to-navy-600' }

export function AdminArticlesStats({
  stats,
  filters,
  onFilter,
  panel,
}: {
  stats: AdminArticleStats
  filters: AdminArticleFilters
  onFilter: (patch: Partial<AdminArticleFilters>) => void
  panel: { open: boolean; onToggle: () => void }
}) {
  const t = useTranslations('publications')
  const maxYear = Math.max(1, ...stats.perYear.map((entry) => entry.count))
  const maxStatus = Math.max(1, ...stats.byStatus.map((entry) => entry.count))
  const maxStudy = Math.max(1, ...stats.byStudy.map((entry) => entry.count))
  const maxJournal = Math.max(1, ...stats.byJournal.map((entry) => entry.count))
  const maxType = Math.max(1, ...stats.byType.map((entry) => entry.count))

  const toggle = (key: keyof AdminArticleFilters, value: string) => ({
    active: filters[key] === value,
    onClick: () => onFilter({ [key]: filters[key] === value ? ALL_ADMIN_FILTER : value }),
  })

  return (
    <div className="rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
      <div className={cn('flex items-center justify-between gap-3', panel.open && 'mb-4')}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold leading-none tracking-tight text-text-primary tabular-nums">
            {stats.total}
          </span>
          <span className="text-[12.5px] font-semibold text-text-secondary">{t('myPub.stats.publications')}</span>
        </div>
        <button
          type="button"
          onClick={panel.onToggle}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-bg-surface px-3 text-xs font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5"
        >
          {panel.open ? t('myPub.stats.hide') : t('myPub.stats.show')}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !panel.open && '-rotate-90')} strokeWidth={2.4} />
        </button>
      </div>

      {panel.open && (
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <StatSectionLabel>{t('myPub.stats.perYear')}</StatSectionLabel>
            {stats.perYear.length === 0 ? (
              <p className="mt-3 text-xs text-text-muted">{t('myPub.stats.noYear')}</p>
            ) : (
              <div className="mt-3 flex h-28 items-end gap-1.5">
                {stats.perYear.map((entry) => (
                  <div key={entry.year} className="flex h-full w-7 flex-col items-center justify-end gap-1.5">
                    <span className="text-xs font-extrabold text-text-primary tabular-nums">{entry.count}</span>
                    <div
                      className="w-full max-w-[18px] rounded-t-md bg-gradient-to-b from-coral-500 to-coral-600"
                      style={{ height: entry.count === 0 ? 3 : Math.round((entry.count / maxYear) * 84) }}
                    />
                    <span className="text-[11px] font-semibold text-text-muted tabular-nums">{entry.year}</span>
                  </div>
                ))}
              </div>
            )}
            {stats.pending > 0 && (
              <div className="mt-3 max-w-[260px] border-t border-line pt-3">
                <StatBar
                  label={t('myPub.stats.inSubmission')}
                  count={stats.pending}
                  pct={Math.round((stats.pending / Math.max(1, stats.total)) * 100)}
                  color={NAVY_BAR}
                />
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
                  toggle={toggle('status', entry.status)}
                />
              ))}
            </div>
          </div>

          <div>
            <StatSectionLabel>{t('articles.stats.byStudy')}</StatSectionLabel>
            <div className="mt-3 flex flex-col gap-2.5">
              {stats.byStudy.length === 0 ? (
                <p className="text-xs text-text-muted">{t('articles.stats.noStudy')}</p>
              ) : (
                stats.byStudy.map((entry) => (
                  <StatBar
                    key={entry.study}
                    label={entry.study}
                    count={entry.count}
                    pct={Math.round((entry.count / maxStudy) * 100)}
                    color={CORAL_BAR}
                    toggle={toggle('study', entry.study)}
                  />
                ))
              )}
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
                    color={NAVY_BAR}
                    toggle={toggle('journal', entry.journal)}
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
                  toggle={toggle('type', entry.type)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
