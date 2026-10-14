'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Library, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { DashboardArticleItem } from '@/lib/publications/admin-dashboard'
import { matchesArticleQuery } from '@/lib/publications/article-search'
import { sharedAuthorNames } from '@/lib/publications/mail-agent'
import { ARTICLE_STATUS_TONE, ARTICLE_STATUS_VALUES, TONE_PILL_CLASS } from '@/lib/publications/status-display'

const ONGOING = 'ONGOING'
const ALL = 'ALL'
const VISIBLE_AUTHORS = 4

type ArticlePickerDialogProps = {
  articles: DashboardArticleItem[]
  mailAuthors: string[]
  selectedId: string
  onSelect: (articleId: string) => void
}

function isOngoing(article: DashboardArticleItem): boolean {
  return article.status !== 'PUBLISHED' && article.status !== 'ABANDONED'
}

function authorSummary(article: DashboardArticleItem): string {
  const names = article.authors.map((author) => author.name)
  if (names.length <= VISIBLE_AUTHORS) return names.join(', ')
  return `${names.slice(0, VISIBLE_AUTHORS - 1).join(', ')}, … ${names.at(-1)}`
}

export function ArticlePickerDialog({ articles, mailAuthors, selectedId, onSelect }: ArticlePickerDialogProps) {
  const t = useTranslations('publications')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(ONGOING)
  const selected = articles.find((article) => article.id === selectedId) ?? null

  const rows = useMemo(() => {
    const visible = articles.filter((article) => {
      if (statusFilter === ONGOING && !isOngoing(article)) return false
      if (statusFilter !== ONGOING && statusFilter !== ALL && article.status !== statusFilter) return false
      return matchesArticleQuery(article, query)
    })
    return visible
      .map((article) => ({
        article,
        shared: sharedAuthorNames(mailAuthors, article.authors.map((author) => author.name)),
      }))
      .sort((first, second) => second.shared.length - first.shared.length)
  }, [articles, mailAuthors, query, statusFilter])

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
      <DialogContent className="flex max-h-[90vh] max-w-[min(1200px,95vw)] flex-col gap-4">
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
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-line">
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-base text-text-primary">{t('mailAgent.picker.empty')}</p>
          ) : (
            <table className="w-full text-base">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('mailAgent.columns.article')}</TableHead>
                  <TableHead>{t('mailAgent.columns.journal')}</TableHead>
                  <TableHead>{t('mailAgent.picker.statusColumn')}</TableHead>
                  <TableHead>{t('mailAgent.picker.year')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ article, shared }) => (
                  <TableRow key={article.id} aria-label={article.title}>
                    <TableCell className="min-w-[420px] space-y-1 whitespace-normal">
                      <span className="block font-semibold text-text-primary">{article.title}</span>
                      <span className="block text-sm text-text-primary">{authorSummary(article)}</span>
                      {shared.length > 0 && (
                        <span className="block text-sm font-semibold text-coral-700 dark:text-coral-300">
                          {t('mailAgent.picker.shared', { names: shared.join(', ') })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-text-primary">{article.journal ?? '—'}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm font-bold ${TONE_PILL_CLASS[ARTICLE_STATUS_TONE[article.status]]}`}
                      >
                        {t(`articles.status.${article.status}`)}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-text-primary">{article.year ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" size="sm" onClick={() => choose(article.id)}>
                        {t('mailAgent.picker.choose')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
