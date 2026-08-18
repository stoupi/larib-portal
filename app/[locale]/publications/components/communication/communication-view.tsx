'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ARTICLE_STATUS_TONE, pillClassName } from '@/lib/publications/status-display'
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import {
  COMMUNICATION_TABS,
  communicationTabCounts,
  filterCommunicationArticles,
  type CommunicationArticleItem,
  type CommunicationTab,
} from '@/lib/publications/communication'
import { CarouselEmailDialog, useCarouselEmailDialog } from '../article/carousel-email-dialog'
import { CarouselEmailTag } from './carousel-email-tag'
import { CarouselSendButton } from './carousel-send-button'

const ADMIN_PATHS = publicationsPaths(PUBLICATIONS_ADMIN_BASE)

export function CommunicationView({
  articles,
  locale,
}: {
  articles: CommunicationArticleItem[]
  locale: string
}) {
  const t = useTranslations('publications.communication')
  const tStatus = useTranslations('publications.articles.status')
  const [tab, setTab] = useState<CommunicationTab>('pending')
  const [query, setQuery] = useState('')
  const carouselDialog = useCarouselEmailDialog()

  const counts = useMemo(() => communicationTabCounts(articles), [articles])
  const visible = useMemo(() => filterCommunicationArticles(articles, tab, query), [articles, tab, query])
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  return (
    <div className="space-y-6">
      <header className="flex items-stretch gap-3.5">
        <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('title')}</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-secondary">{t('subtitle')}</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className="rounded-2xl bg-bg-surface pl-9 shadow-sm"
          />
        </div>
        <div className="inline-flex flex-wrap rounded-2xl border border-line bg-bg-surface p-1 shadow-sm">
          {COMMUNICATION_TABS.map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => setTab(candidate)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-text-secondary transition',
                tab === candidate &&
                  'bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_8px_18px_-8px_rgba(214,31,85,0.6)]',
              )}
            >
              {t(`tab.${candidate}`)}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                  tab === candidate
                    ? 'bg-white/25 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-text-secondary',
                )}
              >
                {counts[candidate]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-bg-surface shadow-elevation-xs">
        {visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm font-semibold text-text-secondary">{t('empty')}</p>
        ) : (
          visible.map((article) => (
            <div
              key={article.id}
              className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4 last:border-b-0 transition-colors hover:bg-coral-50/40 dark:hover:bg-coral-500/[0.06]"
            >
              <div className="min-w-[240px] flex-1">
                <Link
                  href={ADMIN_PATHS.article(article.id)}
                  className="block truncate text-[15px] font-extrabold text-text-primary hover:text-coral-600"
                >
                  {article.title || t('untitled')}
                </Link>
                <div className="mt-1 truncate text-[12px] text-text-secondary">
                  {[
                    article.firstAuthorName,
                    article.journal,
                    article.milestoneAt ? dateFormatter.format(new Date(article.milestoneAt)) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <span className={pillClassName(ARTICLE_STATUS_TONE[article.status])}>{tStatus(article.status)}</span>
              <CarouselEmailTag sentAt={article.carouselEmailSentAt} locale={locale} />
              <CarouselSendButton
                alreadySent={article.carouselEmailSentAt !== null}
                onClick={() => carouselDialog.openFor(article.id)}
              />
            </div>
          ))
        )}
      </div>

      <CarouselEmailDialog controller={carouselDialog} />
    </div>
  )
}
