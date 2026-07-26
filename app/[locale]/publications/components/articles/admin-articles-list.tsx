'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { FileText, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import type { DashboardArticleItem } from '@/lib/publications/admin-dashboard'
import {
  ADMIN_ARTICLE_TABS,
  DEFAULT_ADMIN_ARTICLE_FILTERS,
  adminArticleGroupCounts,
  adminJournalOptions,
  adminStudyOptions,
  computeAdminArticleStats,
  filterAdminArticles,
  type AdminArticleFilters,
  type AdminArticleGroup,
} from '@/lib/publications/admin-article-stats'
import { ArticleListRow, ArticlesHeaderRow } from './article-list-row'
import { AdminArticlesStats } from './admin-articles-stats'
import { AdminArticlesFilters } from './admin-articles-filters'

const TAB_LABEL: Record<AdminArticleGroup, string> = {
  all: 'myPub.tabs.all',
  inProgress: 'myPub.tabs.inProgress',
  draft: 'myPub.tabs.draft',
  published: 'myPub.tabs.published',
  other: 'myPub.tabs.all',
}

export function AdminArticlesList({
  articles,
  locale,
  journalNames,
}: {
  articles: DashboardArticleItem[]
  locale: string
  journalNames: string[]
}) {
  const t = useTranslations('publications')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<AdminArticleGroup>('all')
  const [filters, setFilters] = useState<AdminArticleFilters>(DEFAULT_ADMIN_ARTICLE_FILTERS)
  const [statsOpen, setStatsOpen] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const counts = useMemo(() => adminArticleGroupCounts(articles), [articles])
  const studies = useMemo(() => adminStudyOptions(articles), [articles])
  const journals = useMemo(() => adminJournalOptions(articles), [articles])
  const rows = useMemo(() => filterAdminArticles(articles, filters, group, query), [articles, filters, group, query])
  const stats = useMemo(() => computeAdminArticleStats(articles), [articles])

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <AdminArticlesStats
        stats={stats}
        filters={filters}
        onFilter={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        panel={{ open: statsOpen, onToggle: () => setStatsOpen((value) => !value) }}
      />

      <div className="flex flex-nowrap items-stretch gap-2 overflow-x-auto pb-0.5">
        <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-line bg-bg-surface p-1 shadow-elevation-xs">
          {ADMIN_ARTICLE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setGroup(tab)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-bold transition',
                group === tab
                  ? 'bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_6px_14px_-6px_rgba(214,31,85,0.55)]'
                  : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-white/5',
              )}
            >
              {t(TAB_LABEL[tab])}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums',
                  group === tab ? 'bg-white/25 text-white' : 'bg-gray-100 text-text-secondary dark:bg-white/10',
                )}
              >
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        <AdminArticlesFilters
          value={filters}
          studies={studies}
          journals={journals}
          onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        />

        <div className="relative min-w-[220px] shrink-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('articles.search')}
            className="h-full rounded-xl bg-bg-surface pl-9 shadow-elevation-xs"
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-line bg-bg-surface shadow-elevation-sm">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-coral-100 bg-coral-50 text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300">
              <FileText className="h-7 w-7" strokeWidth={1.7} />
            </div>
            <p className="text-[17px] font-bold text-text-primary">{t('adminHome.noArticles')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <ArticlesHeaderRow />
              {rows.map((article) => (
                <ArticleListRow
                  key={article.id}
                  article={article}
                  locale={locale}
                  expansion={{ open: expanded.has(article.id), onToggle: () => toggleExpanded(article.id), journalNames }}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
