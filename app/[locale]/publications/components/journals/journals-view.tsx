'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Link } from '@/app/i18n/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Plus, RefreshCw, Search, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { refreshSjrAction } from '../../actions'
import {
  IMPACT_BUCKETS,
  computeJournalBankSummary,
  impactBucket,
  type ImpactBucket,
  type JournalMetrics,
} from '@/lib/publications/journal-metrics'
import { JournalsSummary } from './journals-summary'
import { JournalsTable, type JournalSortKey } from './journals-table'

type BucketFilter = 'all' | ImpactBucket
const ALL_PUBLISHERS = 'all'

function sortValue(journal: JournalMetrics, key: JournalSortKey): string | number {
  switch (key) {
    case 'journal':
      return journal.name.toLowerCase()
    case 'impactFactor':
      return journal.impactFactor ?? -1
    case 'sjr':
      return journal.sjr ?? -1
    case 'published':
      return journal.publishedCount
    case 'ongoing':
      return journal.ongoingCount
    case 'acceptance':
      return journal.acceptanceRate ?? -1
    case 'delay':
      return journal.avgDelayDays ?? Number.MAX_SAFE_INTEGER
  }
}

export function JournalsView({ journals }: { journals: JournalMetrics[] }) {
  const t = useTranslations('publications.journals')
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [bucket, setBucket] = useState<BucketFilter>('all')
  const [publisher, setPublisher] = useState(ALL_PUBLISHERS)
  const [sort, setSort] = useState<{ key: JournalSortKey; direction: 'asc' | 'desc' }>({ key: 'published', direction: 'desc' })

  const { execute: runRefresh, isExecuting: refreshing } = useAction(refreshSjrAction, {
    onSuccess({ data }) {
      toast.success(data?.hasDataset ? t('refreshDone', { count: data.updated }) : t('refreshNoData'))
      router.refresh()
    },
    onError() {
      toast.error(t('refreshError'))
    },
  })

  const publishers = useMemo(
    () =>
      [...new Set(journals.map((journal) => journal.publisher).filter((name): name is string => Boolean(name)))].sort((first, second) =>
        first.localeCompare(second),
      ),
    [journals],
  )

  const bucketCounts = useMemo(() => {
    const counts: Record<BucketFilter, number> = { all: journals.length, high: 0, mid: 0, low: 0 }
    for (const journal of journals) {
      const journalBucket = impactBucket(journal.impactFactor)
      if (journalBucket) counts[journalBucket] += 1
    }
    return counts
  }, [journals])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return journals.filter((journal) => {
      if (bucket !== 'all' && impactBucket(journal.impactFactor) !== bucket) return false
      if (publisher !== ALL_PUBLISHERS && journal.publisher !== publisher) return false
      if (!needle) return true
      return journal.name.toLowerCase().includes(needle) || (journal.publisher ?? '').toLowerCase().includes(needle)
    })
  }, [journals, query, bucket, publisher])

  const sorted = useMemo(() => {
    const direction = sort.direction === 'asc' ? 1 : -1
    return [...filtered].sort((first, second) => {
      const firstValue = sortValue(first, sort.key)
      const secondValue = sortValue(second, sort.key)
      if (firstValue < secondValue) return -1 * direction
      if (firstValue > secondValue) return 1 * direction
      return first.name.localeCompare(second.name)
    })
  }, [filtered, sort])

  const summary = useMemo(() => computeJournalBankSummary(filtered), [filtered])

  function toggleSort(key: JournalSortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'journal' ? 'asc' : 'desc' },
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-stretch gap-3.5">
          <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('title')}</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-secondary">{t('bankSubtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => runRefresh({})} disabled={refreshing} className="gap-2">
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
            {t('refreshMetrics')}
          </Button>
          <Button
            asChild
            className="gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105"
          >
            <Link href="/publications/admin/journals/new">
              <Plus className="size-4" />
              {t('addJournal')}
            </Link>
          </Button>
        </div>
      </header>

      <JournalsSummary summary={summary} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('bankSearch')}
              className="rounded-2xl bg-bg-surface pl-9 shadow-sm"
            />
          </div>
          <div className="inline-flex flex-wrap rounded-2xl border border-line bg-bg-surface p-1 shadow-sm">
            {(['all', ...IMPACT_BUCKETS] as BucketFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setBucket(tab)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-text-secondary transition',
                  bucket === tab && 'bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_8px_18px_-8px_rgba(214,31,85,0.6)]',
                )}
              >
                {tab === 'all' ? t('tabAll') : t(`impact.${tab}`)}
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                    bucket === tab ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-text-secondary',
                  )}
                >
                  {bucketCounts[tab]}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-bg-surface px-4 py-2 shadow-sm">
          <label htmlFor="journals-filter-publisher" className="text-sm font-semibold text-text-secondary">
            {t('colPublisher')}
          </label>
          <span className="relative">
            <Select
              id="journals-filter-publisher"
              value={publisher}
              onChange={(event) => setPublisher(event.target.value)}
              className="h-8 w-auto max-w-[220px] appearance-none rounded-full border-line bg-gray-50 pl-3.5 pr-8 text-sm font-bold text-text-primary dark:bg-white/10"
            >
              <option value={ALL_PUBLISHERS}>{t('tabAll')}</option>
              {publishers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          </span>
        </div>
      </div>

      <JournalsTable journals={sorted} sort={sort} onSort={toggleSort} />
    </div>
  )
}
