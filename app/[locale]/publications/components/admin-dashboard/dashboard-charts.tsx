'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/app/i18n/navigation'
import { ARTICLE_STATUS_TONE, TONE_DOT_HEX } from '@/lib/publications/status-display'
import type { DashboardMetrics } from '@/lib/publications/admin-dashboard'

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

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-text-muted">{children}</p>
}

export function DashboardCharts({ metrics }: { metrics: DashboardMetrics }) {
  const t = useTranslations('publications.adminHome.charts')
  const tStatus = useTranslations('publications.articles')
  const maxCoAuthor = Math.max(1, ...metrics.topCoAuthors.map((entry) => entry.count))
  const maxYear = Math.max(1, ...metrics.perYear.map((entry) => entry.count))
  const statusTotal = metrics.byStatus.reduce((sum, entry) => sum + entry.count, 0)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t('byCoAuthor')}</CardTitle>
          <Link href="/publications/admin/authors" className="text-xs font-bold text-coral-600 hover:underline">
            {t('all')}
          </Link>
        </div>
        {metrics.topCoAuthors.length === 0 ? (
          <EmptyHint>{t('noData')}</EmptyHint>
        ) : (
          <ul className="mt-4 space-y-3.5">
            {metrics.topCoAuthors.map((coAuthor, index) => (
              <li key={coAuthor.id} className="flex items-center gap-3">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${AVATAR_CLASSES[index % AVATAR_CLASSES.length]}`}
                >
                  {initials(coAuthor.name)}
                </span>
                <span className="w-32 shrink-0 truncate text-sm font-semibold text-text-primary" title={coAuthor.name}>
                  {coAuthor.name}
                </span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-coral-500 to-coral-600"
                    style={{ width: `${Math.round((coAuthor.count / maxCoAuthor) * 100)}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right text-sm font-extrabold text-text-primary tabular-nums">
                  {coAuthor.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
        <CardTitle>{t('byYear')}</CardTitle>
        {metrics.perYear.length === 0 ? (
          <EmptyHint>{t('noData')}</EmptyHint>
        ) : (
          <div className="mt-6 flex h-40 items-end justify-around gap-2">
            {metrics.perYear.map((entry) => (
              <div key={entry.year} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-sm font-extrabold text-text-primary tabular-nums">{entry.count}</span>
                <span
                  className="w-full max-w-[54px] rounded-t-lg bg-coral-100 dark:bg-coral-500/25"
                  style={{ height: entry.count === 0 ? 4 : Math.round((entry.count / maxYear) * 108) }}
                />
                <span className="text-xs font-semibold text-text-muted tabular-nums">{entry.year}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
        <CardTitle>{t('byStatus')}</CardTitle>
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
            <ul className="mt-5 space-y-3.5">
              {metrics.byStatus.map((entry) => (
                <li key={entry.status} className="flex items-center gap-2.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: TONE_DOT_HEX[ARTICLE_STATUS_TONE[entry.status]] }}
                  />
                  <span className="flex-1 truncate text-sm text-text-primary">{tStatus(`status.${entry.status}`)}</span>
                  <span className="text-sm font-extrabold text-text-primary tabular-nums">{entry.count}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
