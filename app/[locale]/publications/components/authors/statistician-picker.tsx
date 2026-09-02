'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search, Sigma, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  matchesAuthorQuery,
  partitionStatisticianCandidates,
  sortAuthors,
  truncateAuthors,
  type PickerAuthor,
} from '@/lib/publications/author-picker'
import { CreateAuthorPanel, type PickerCentre } from './author-create-panel'
import { OurTeamDot } from './our-team-dot'

export function statisticianName(statistician: { firstName: string; lastName: string } | null): string | null {
  if (!statistician) return null
  return `${statistician.firstName} ${statistician.lastName.toUpperCase()}`.trim()
}

function CandidateRow({
  author,
  selected,
  onChoose,
}: {
  author: PickerAuthor
  selected: boolean
  onChoose: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onChoose}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition hover:border-coral-300 hover:bg-coral-50/40 dark:hover:bg-white/5',
          selected
            ? 'border-coral-300 bg-coral-50 dark:border-coral-500/40 dark:bg-coral-500/10'
            : 'border-line bg-bg-surface',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-text-primary">
            {author.firstName} {author.lastName.toUpperCase()}
            {author.degrees && <span className="ml-1.5 font-normal text-text-muted">{author.degrees}</span>}
          </span>
          {author.centreName && (
            <span className="block truncate text-xs text-text-secondary">{author.centreName}</span>
          )}
        </span>
        {author.isOurTeam && <OurTeamDot />}
      </button>
    </li>
  )
}

export function StatisticianPicker({
  current,
  bank,
  onSelect,
  editable,
  articleAuthorIds,
}: {
  current: { id: string; firstName: string; lastName: string; degrees: string | null } | null
  bank: { authors: PickerAuthor[]; centres: PickerCentre[] }
  onSelect: (statisticianId: string | null) => void
  editable: boolean
  articleAuthorIds: string[]
}) {
  const t = useTranslations('publications.editor')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const currentName = statisticianName(current)
  const matching = bank.authors.filter((author) => matchesAuthorQuery(author, query))
  const { signatories, others } = partitionStatisticianCandidates(matching, articleAuthorIds)
  const { visible, hiddenCount } = truncateAuthors(sortAuthors(others, 'frequent'))

  function choose(statisticianId: string | null) {
    onSelect(statisticianId)
    setOpen(false)
    setQuery('')
  }

  if (!editable) {
    return <span className="text-sm text-text-primary">{currentName ?? '—'}</span>
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-bg-surface px-3 text-left text-sm text-text-primary transition hover:bg-gray-50 dark:hover:bg-white/5"
        >
          <Sigma className="h-3.5 w-3.5 shrink-0 text-text-muted" strokeWidth={2.2} />
          <span className={cn('truncate', !currentName && 'text-text-placeholder')}>
            {currentName ?? t('statistician.add')}
          </span>
        </button>
        {current && (
          <button
            type="button"
            aria-label={t('statistician.clear')}
            onClick={() => choose(null)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-bg-surface text-text-muted transition hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t('statistician.title')}</DialogTitle>
            <DialogDescription>{t('statistician.subtitle')}</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              className="pl-9"
              value={query}
              aria-label={t('picker.searchLabel')}
              placeholder={t('picker.searchPlaceholder')}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {signatories.length === 0 && visible.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-text-muted">
                {t('picker.empty')}
              </p>
            ) : (
              <>
                {signatories.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-text-muted">
                      {t('statistician.amongAuthors')}
                    </p>
                    <ul className="space-y-1.5">
                      {signatories.map((author) => (
                        <CandidateRow
                          key={author.id}
                          author={author}
                          selected={author.id === current?.id}
                          onChoose={() => choose(author.id)}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {visible.length > 0 && (
                  <div className="space-y-1.5">
                    {signatories.length > 0 && (
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-text-muted">
                        {t('statistician.restOfBank')}
                      </p>
                    )}
                    <ul className="space-y-1.5">
                      {visible.map((author) => (
                        <CandidateRow
                          key={author.id}
                          author={author}
                          selected={author.id === current?.id}
                          onChoose={() => choose(author.id)}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {hiddenCount > 0 && (
              <p className="text-center text-xs font-semibold text-text-muted">
                {t('picker.moreHidden', { count: hiddenCount })}
              </p>
            )}

            <CreateAuthorPanel centres={bank.centres} onCreated={(author) => choose(author.id)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
