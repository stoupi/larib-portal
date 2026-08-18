'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/app/i18n/navigation'
import { Pencil, CircleCheck, Clock, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { daysToMonths, impactBucket, type JournalMetrics } from '@/lib/publications/journal-metrics'

export type JournalSortKey = 'journal' | 'impactFactor' | 'sjr' | 'published' | 'ongoing' | 'acceptance' | 'delay'

const IMPACT_PILL: Record<'high' | 'mid' | 'low' | 'none', string> = {
  high: 'border-coral-200 bg-coral-50 text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300',
  mid: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8] dark:border-[rgba(59,130,246,0.32)] dark:bg-[rgba(59,130,246,0.16)] dark:text-[#93C5FD]',
  low: 'border-line bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-text-secondary',
  none: 'border-line bg-transparent text-text-muted',
}

function initials(name: string): string {
  const words = name.split(/[\s–-]+/).filter((word) => /[A-Za-zÀ-ÿ]/.test(word) && word.length > 2)
  if (words.length === 0) return name.slice(0, 4).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase()
  return words
    .slice(0, 4)
    .map((word) => word[0].toUpperCase())
    .join('')
}

function acceptanceTone(rate: number): string {
  if (rate >= 70) return 'text-emerald-600 dark:text-emerald-400'
  if (rate >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function acceptanceBar(rate: number): string {
  if (rate >= 70) return 'bg-emerald-500'
  if (rate >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

export function JournalsTable({
  journals,
  sort,
  onSort,
}: {
  journals: JournalMetrics[]
  sort: { key: JournalSortKey; direction: 'asc' | 'desc' }
  onSort: (key: JournalSortKey) => void
}) {
  const t = useTranslations('publications.journals')

  function SortHead({ sortKey, label }: { sortKey: JournalSortKey; label: string }) {
    const active = sort.key === sortKey
    return (
      <TableHead>
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={cn(
            'inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide hover:text-text-primary',
            active ? 'text-coral-600' : 'text-text-muted',
          )}
        >
          {label}
          {active ? (
            sort.direction === 'asc' ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )
          ) : (
            <ChevronsUpDown className="size-3.5 opacity-40" />
          )}
        </button>
      </TableHead>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-bg-surface shadow-elevation-xs">
      <div className="flex items-center gap-2 px-6 py-4">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-coral-600">{t('title')}</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600 tabular-nums dark:bg-white/10 dark:text-text-secondary">
          {journals.length}
        </span>
      </div>
      <div className="max-h-[620px] overflow-y-auto">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-bg-surface [&_th]:shadow-[0_1px_0_0_var(--color-line)]">
            <TableRow>
              <SortHead sortKey="journal" label={t('colName')} />
              <SortHead sortKey="impactFactor" label={t('colImpactFactor')} />
              <SortHead sortKey="sjr" label={t('colSjr')} />
              <SortHead sortKey="published" label={t('colPublished')} />
              <SortHead sortKey="ongoing" label={t('colOngoing')} />
              <SortHead sortKey="acceptance" label={t('colAcceptance')} />
              <SortHead sortKey="delay" label={t('colDelay')} />
              <TableHead className="text-right text-xs font-bold uppercase tracking-wide text-text-muted">
                {t('colEdit')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {journals.map((journal) => {
              const bucket = impactBucket(journal.impactFactor) ?? 'none'
              return (
                <TableRow key={journal.id}>
                  <TableCell className="max-w-sm">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-xl border text-[10px] font-extrabold',
                          IMPACT_PILL[bucket],
                        )}
                      >
                        {initials(journal.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold text-text-primary" title={journal.name}>
                            {journal.name}
                          </span>
                          {journal.openAccess && (
                            <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                              {t('openAccessBadge')}
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-text-muted">{journal.publisher ?? '—'}</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {journal.impactFactor == null ? (
                      <span className="text-text-muted">—</span>
                    ) : (
                      <span
                        className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-extrabold tabular-nums', IMPACT_PILL[bucket])}
                      >
                        {journal.impactFactor.toFixed(1)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold text-text-primary tabular-nums">
                    {journal.sjr == null ? '—' : journal.sjr.toFixed(1)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 font-bold text-text-primary tabular-nums">
                      <CircleCheck className="size-4 text-emerald-500" />
                      {journal.publishedCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 font-bold text-amber-600 tabular-nums dark:text-amber-400">
                      <Clock className="size-4 text-text-muted" />
                      {journal.ongoingCount}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-[180px]">
                    {journal.acceptanceRate == null ? (
                      <span className="text-text-muted">—</span>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-baseline gap-2">
                          <span className={cn('text-sm font-extrabold tabular-nums', acceptanceTone(journal.acceptanceRate))}>
                            {journal.acceptanceRate}%
                          </span>
                          <span className="text-xs text-text-muted tabular-nums">
                            {journal.acceptedCount}/{journal.submittedCount}
                          </span>
                        </div>
                        <span className="block h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                          <span
                            className={cn('block h-full rounded-full', acceptanceBar(journal.acceptanceRate))}
                            style={{ width: `${journal.acceptanceRate}%` }}
                          />
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {journal.avgDelayDays == null ? (
                      <span className="text-text-muted">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-text-primary tabular-nums">
                        <Clock className="size-4 text-text-muted" />
                        {t('monthsValue', { value: daysToMonths(journal.avgDelayDays) })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/publications/admin/journals/${journal.id}`}
                      aria-label={`${t('edit')} ${journal.name}`}
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-text-muted transition hover:border-coral-200 hover:text-coral-600"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
            {journals.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-text-muted">
                  {t('empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>
    </section>
  )
}
