'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AUTHOR_PICKER_TABS,
  authorsForTab,
  matchesAuthorQuery,
  sortAuthors,
  truncateAuthors,
  type AuthorPickerTab,
  type AuthorSort,
  type PickerAuthor,
} from '@/lib/publications/author-picker'
import { CORAL_BUTTON, CreateAuthorPanel, type PickerCentre } from './author-create-panel'
import { OurTeamDot } from './our-team-dot'

const TAB_LABELS: Record<AuthorPickerTab, 'tabTeam' | 'tabFrequent' | 'tabAll'> = {
  team: 'tabTeam',
  frequent: 'tabFrequent',
  all: 'tabAll',
}

function authorFullName(author: PickerAuthor): string {
  return `${author.firstName} ${author.lastName.toUpperCase()}`.trim()
}

function AuthorRow({
  author,
  selected,
  alreadyAdded,
  onToggle,
}: {
  author: PickerAuthor
  selected: boolean
  alreadyAdded: boolean
  onToggle: () => void
}) {
  const t = useTranslations('publications.editor')
  const name = authorFullName(author)
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2 transition',
        selected
          ? 'border-coral-300 bg-coral-50 dark:border-coral-500/40 dark:bg-coral-500/10'
          : 'border-line bg-bg-surface',
      )}
    >
      {alreadyAdded ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-gray-50 px-2 py-0.5 text-[10.5px] font-bold text-text-secondary dark:bg-white/5">
          <Check className="h-3 w-3" strokeWidth={2.4} />
          {t('picker.added')}
        </span>
      ) : (
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={name} />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">
          {name}
          {author.degrees && <span className="ml-1.5 font-normal text-text-muted">{author.degrees}</span>}
        </p>
        {author.centreName && <p className="truncate text-xs text-text-secondary">{author.centreName}</p>}
      </div>
      {author.isOurTeam && <OurTeamDot />}
      <span className="shrink-0 text-[11px] font-bold text-text-muted tabular-nums">
        {t('picker.publicationCount', { count: author.publicationCount })}
      </span>
    </li>
  )
}

export function AuthorPickerDialog({
  open,
  onOpenChange,
  authors,
  centres,
  alreadyAddedIds,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  authors: PickerAuthor[]
  centres: PickerCentre[]
  alreadyAddedIds: string[]
  onConfirm: (authorIds: string[]) => void
}) {
  const t = useTranslations('publications.editor')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<AuthorPickerTab>('team')
  const [sort, setSort] = useState<AuthorSort>('frequent')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [createdAuthors, setCreatedAuthors] = useState<PickerAuthor[]>([])

  const allAuthors = [...createdAuthors, ...authors]
  const addedIds = new Set(alreadyAddedIds)
  const tabAuthors = authorsForTab(allAuthors, tab)
  const matching = tabAuthors.filter((author) => matchesAuthorQuery(author, query))
  const { visible, hiddenCount } = truncateAuthors(sortAuthors(matching, sort))

  function toggleAuthor(authorId: string) {
    setSelectedIds((current) =>
      current.includes(authorId) ? current.filter((id) => id !== authorId) : [...current, authorId],
    )
  }

  function close() {
    setSelectedIds([])
    setQuery('')
    onOpenChange(false)
  }

  function confirm() {
    if (selectedIds.length === 0) return
    onConfirm(selectedIds)
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t('picker.title')}</DialogTitle>
          <DialogDescription>{t('picker.subtitle', { count: authors.length })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs value={tab} onValueChange={(next) => setTab(next as AuthorPickerTab)}>
              <TabsList>
                {AUTHOR_PICKER_TABS.map((pickerTab) => (
                  <TabsTrigger key={pickerTab} value={pickerTab} className="gap-1.5 text-xs font-bold">
                    {t(`picker.${TAB_LABELS[pickerTab]}`)}
                    <span className="tabular-nums opacity-60">{authorsForTab(allAuthors, pickerTab).length}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">
                {t('picker.sortLabel')}
              </span>
              {(['frequent', 'alphabetical'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSort(option)}
                  aria-pressed={sort === option}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs font-bold transition',
                    sort === option
                      ? 'border-coral-300 bg-coral-50 text-coral-600 dark:border-coral-500/40 dark:bg-coral-500/15 dark:text-coral-300'
                      : 'border-line bg-bg-surface text-text-secondary hover:bg-gray-50 dark:hover:bg-white/5',
                  )}
                >
                  {option === 'frequent' ? t('picker.sortFrequent') : t('picker.sortAlphabetical')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-text-muted">
              {t('picker.empty')}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {visible.map((author) => (
                <AuthorRow
                  key={author.id}
                  author={author}
                  selected={selectedIds.includes(author.id)}
                  alreadyAdded={addedIds.has(author.id)}
                  onToggle={() => toggleAuthor(author.id)}
                />
              ))}
            </ul>
          )}

          {hiddenCount > 0 && (
            <p className="text-center text-xs font-semibold text-text-muted">
              {t('picker.moreHidden', { count: hiddenCount })}
            </p>
          )}

          <CreateAuthorPanel
            centres={centres}
            onCreated={(author) => {
              setCreatedAuthors((current) => [author, ...current])
              setSelectedIds((current) => [...current, author.id])
            }}
          />
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <p className="text-xs font-semibold text-text-secondary">
            {selectedIds.length === 0
              ? t('picker.selectionHint')
              : t('picker.selectedCount', { count: selectedIds.length })}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={close}>
              {t('picker.cancel')}
            </Button>
            <Button type="button" className={CORAL_BUTTON} disabled={selectedIds.length === 0} onClick={confirm}>
              {t('picker.confirm')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
