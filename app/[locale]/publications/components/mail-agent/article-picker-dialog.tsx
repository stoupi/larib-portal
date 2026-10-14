'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Library, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { DashboardArticleItem } from '@/lib/publications/admin-dashboard'
import { matchesArticleQuery } from '@/lib/publications/article-search'
import { sharedAuthorNames } from '@/lib/publications/mail-agent'
import { ARTICLE_STATUS_VALUES } from '@/lib/publications/status-display'
import { nextArticleSort, sortArticles, type ArticleSort } from '@/lib/publications/article-sort'
import { ArticleListRow, ArticlesHeaderRow } from '../articles/article-list-row'

const ONGOING = 'ONGOING'
const ALL = 'ALL'

type ArticlePickerDialogProps = {
  articles: DashboardArticleItem[]
  mailAuthors: string[]
  selectedId: string
  onSelect: (articleId: string) => void
}

function isOngoing(article: DashboardArticleItem): boolean {
  return article.status !== 'PUBLISHED' && article.status !== 'ABANDONED'
}

export function ArticlePickerDialog({ articles, mailAuthors, selectedId, onSelect }: ArticlePickerDialogProps) {
  const t = useTranslations('publications')
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [sort, setSort] = useState<ArticleSort>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(ONGOING)
  const selected = articles.find((article) => article.id === selectedId) ?? null

  const rows = useMemo(() => {
    const visible = articles.filter((article) => {
      if (statusFilter === ONGOING && !isOngoing(article)) return false
      if (statusFilter !== ONGOING && statusFilter !== ALL && article.status !== statusFilter) return false
      return matchesArticleQuery(article, query)
    })
    const withShared = sortArticles(visible, sort).map((article) => ({
      article,
      shared: sharedAuthorNames(mailAuthors, article.authors.map((author) => author.name)),
    }))
    if (sort) return withShared
    return withShared.sort((first, second) => second.shared.length - first.shared.length)
  }, [articles, mailAuthors, query, statusFilter, sort])

  const choose = (articleId: string) => {
    onSelect(articleId)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex flex-wrap items-center gap-3">
        {selected && <span className="text-base font-semibold text-text-primary">{selected.title}</span>}
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            <Library className="size-4" />
            {selected ? t('mailAgent.picker.change') : t('mailAgent.picker.open')}
          </Button>
        </DialogTrigger>
        {selected && (
          <Button type="button" variant="ghost" onClick={() => onSelect('')}>
            {t('mailAgent.picker.clear')}
          </Button>
        )}
      </div>
      <DialogContent className="flex max-h-[90vh] max-w-[min(1500px,96vw)] flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="text-xl">{t('mailAgent.picker.title')}</DialogTitle>
        </DialogHeader>
        {mailAuthors.length > 0 && (
          <p className="text-base text-text-primary">
            {t('mailAgent.mailAuthors', { names: mailAuthors.join(', ') })}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[280px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-primary" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('mailAgent.picker.search')}
              aria-label={t('mailAgent.picker.search')}
              className="h-10 pl-9 text-base"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label={t('mailAgent.picker.status')}
            className="h-10 w-[220px] text-base"
          >
            <option value={ONGOING}>{t('mailAgent.picker.ongoing')}</option>
            <option value={ALL}>{t('mailAgent.picker.allStatuses')}</option>
            {ARTICLE_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {t(`articles.status.${status}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-line bg-bg-surface">
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-base text-text-primary">{t('mailAgent.picker.empty')}</p>
          ) : (
            <div className="min-w-[980px]">
              <ArticlesHeaderRow
                sorting={{ value: sort, onSort: (key) => setSort((current) => nextArticleSort(current, key)) }}
              />
              {rows.map(({ article, shared }) => (
                <ArticleListRow
                  key={article.id}
                  article={article}
                  locale={locale}
                  expansion={null}
                  picking={{
                    chooseLabel: t('mailAgent.picker.choose'),
                    onChoose: () => choose(article.id),
                    note: shared.length > 0 ? t('mailAgent.picker.shared', { names: shared.join(', ') }) : null,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
