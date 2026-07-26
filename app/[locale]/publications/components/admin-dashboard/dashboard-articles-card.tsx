'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, FileText } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import type { DashboardArticleItem } from '@/lib/publications/admin-dashboard'
import { ArticleListRow, ArticlesHeaderRow } from '../articles/article-list-row'

export function DashboardArticlesCard({
  articles,
  locale,
  journalNames,
}: {
  articles: DashboardArticleItem[]
  locale: string
  journalNames: string[]
}) {
  const t = useTranslations('publications.adminHome')
  const tArticles = useTranslations('publications.articles')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-bg-surface shadow-elevation-sm">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-coral-600">{tArticles('title')}</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600 tabular-nums dark:bg-white/10 dark:text-text-secondary">
            {articles.length}
          </span>
        </div>
        <Link
          href="/publications/admin/articles"
          className="inline-flex items-center gap-2 text-sm font-bold text-coral-600 hover:underline"
        >
          {t('openLibrary')}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center px-8 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-coral-100 bg-coral-50 text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300">
            <FileText className="h-7 w-7" strokeWidth={1.7} />
          </div>
          <p className="text-[17px] font-bold text-text-primary">{t('noArticles')}</p>
        </div>
      ) : (
        <div className="max-h-[640px] overflow-auto">
          <div className="min-w-[980px]">
            <ArticlesHeaderRow />
            {articles.map((article) => (
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
  )
}
