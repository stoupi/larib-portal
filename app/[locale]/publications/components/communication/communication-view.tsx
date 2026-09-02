'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, ChevronsUpDown, Linkedin, Search } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import { Input } from '@/components/ui/input'
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ARTICLE_STATUS_TONE, pillClassName } from '@/lib/publications/status-display'
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import {
  COMMUNICATION_TABS,
  communicationTabCounts,
  filterCommunicationArticles,
  nextCommunicationSort,
  sortCommunicationArticles,
  type CommunicationArticleItem,
  type CommunicationSortKey,
} from '@/lib/publications/communication'
import { useUrlCommunicationFilters } from './use-url-communication-filters'
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
  const { filters, updateFilters } = useUrlCommunicationFilters()
  const { tab, query, sort } = filters
  const carouselDialog = useCarouselEmailDialog()

  const counts = useMemo(() => communicationTabCounts(articles), [articles])
  const visible = useMemo(
    () => sortCommunicationArticles(filterCommunicationArticles(articles, tab, query), sort),
    [articles, tab, query, sort],
  )
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  function SortHead({ sortKey, label }: { sortKey: CommunicationSortKey; label: string }) {
    const active = sort.key === sortKey
    return (
      <TableHead>
        <button
          type="button"
          onClick={() => updateFilters({ sort: nextCommunicationSort(sort, sortKey) })}
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
    <div className="space-y-6">
      <header className="flex items-stretch gap-3.5">
        <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('title')}</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-secondary">{t('subtitle')}</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={query}
            onChange={(event) => updateFilters({ query: event.target.value })}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="rounded-2xl bg-bg-surface pl-9 shadow-sm"
          />
        </div>
        <div className="inline-flex flex-wrap rounded-2xl border border-line bg-bg-surface p-1 shadow-sm">
          {COMMUNICATION_TABS.map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => updateFilters({ tab: candidate })}
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

      <section className="overflow-hidden rounded-2xl border border-line bg-bg-surface shadow-elevation-xs">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <TableHeader>
              <TableRow>
                <SortHead sortKey="title" label={t('colTitle')} />
                <TableHead className="text-xs font-bold uppercase tracking-wide text-text-muted">
                  {t('colJournal')}
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wide text-text-muted">
                  {t('colStatus')}
                </TableHead>
                <SortHead sortKey="acceptedAt" label={t('colAcceptedAt')} />
                <TableHead className="text-xs font-bold uppercase tracking-wide text-text-muted">
                  {t('colEmail')}
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wide text-text-muted">
                  {t('colAction')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm font-semibold text-text-secondary">
                    {t('empty')}
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="max-w-md">
                      <Link
                        href={ADMIN_PATHS.article(article.id)}
                        className="block truncate font-extrabold text-text-primary hover:text-coral-600"
                      >
                        {article.title || t('untitled')}
                      </Link>
                      <span className="mt-0.5 block truncate text-[12px] text-text-secondary">
                        {article.authorNames.join(', ') || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-text-secondary">{article.journal ?? '—'}</TableCell>
                    <TableCell>
                      <span className={pillClassName(ARTICLE_STATUS_TONE[article.status])}>
                        {tStatus(article.status)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-text-secondary">
                      {article.acceptedAt ? dateFormatter.format(new Date(article.acceptedAt)) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CarouselEmailTag sentAt={article.carouselEmailSentAt} locale={locale} />
                        {article.linkedinPostUrl && (
                          <a
                            href={article.linkedinPostUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`${t('linkedinOpen')}: ${article.title}`}
                            className="inline-flex text-[#0A66C2] transition hover:opacity-80"
                          >
                            <Linkedin className="size-4" strokeWidth={2.2} />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <CarouselSendButton
                        alreadySent={article.carouselEmailSentAt !== null}
                        onClick={() => carouselDialog.openFor(article.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>
      </section>

      <CarouselEmailDialog controller={carouselDialog} />
    </div>
  )
}
