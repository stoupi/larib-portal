'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Mail, Plus, Save, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuthorOption } from '@/lib/services/publications/authors'
import { moveAuthorship, type AuthorshipEntry } from '@/lib/publications/author-list'
import { setArticleAuthorsAction } from '../../actions'
import { CollapsibleCard } from './collapsible-card'

function authorLabel(option: AuthorOption): string {
  return `${option.firstName} ${option.lastName.toUpperCase()}`.trim()
}

export function EditorAuthorsAdmin({
  articleId,
  initialAuthors,
  authorOptions,
}: {
  articleId: string
  initialAuthors: AuthorshipEntry[]
  authorOptions: AuthorOption[]
}) {
  const t = useTranslations('publications.editor')
  const router = useRouter()
  const [entries, setEntries] = useState<AuthorshipEntry[]>(initialAuthors)
  const [pickedAuthorId, setPickedAuthorId] = useState('')

  const save = useAction(setArticleAuthorsAction, {
    onSuccess() {
      toast.success(t('authorsSaved'))
      router.refresh()
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  const optionsById = new Map(authorOptions.map((option) => [option.id, option]))
  const remaining = authorOptions.filter((option) => !entries.some((entry) => entry.authorId === option.id))

  function addPickedAuthor() {
    if (!pickedAuthorId) return
    setEntries((current) => [...current, { authorId: pickedAuthorId, isCorresponding: false }])
    setPickedAuthorId('')
  }

  return (
    <CollapsibleCard
      title={
        <>
          <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-coral-600">
            <span className="h-2 w-2 rounded-full bg-coral-500" />
            {t('authorsTitle')}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-extrabold text-text-secondary tabular-nums dark:bg-white/10">
            {entries.length}
          </span>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{t('authorsAdminHint')}</p>

      {entries.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-text-muted">
          {t('noAuthorYet')}
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {entries.map((entry, index) => {
            const option = optionsById.get(entry.authorId)
            return (
              <li
                key={entry.authorId}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[11px] font-bold text-text-secondary tabular-nums dark:bg-white/10">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
                  {option ? authorLabel(option) : entry.authorId}
                </span>
                <button
                  type="button"
                  title={t('markCorresponding')}
                  aria-label={`${t('markCorresponding')}: ${option ? authorLabel(option) : entry.authorId}`}
                  aria-pressed={entry.isCorresponding}
                  onClick={() =>
                    setEntries((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, isCorresponding: !item.isCorresponding } : item,
                      ),
                    )
                  }
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition',
                    entry.isCorresponding
                      ? 'border-coral-200 bg-coral-50 text-coral-600 dark:border-coral-500/40 dark:bg-coral-500/15 dark:text-coral-300'
                      : 'border-line bg-bg-surface text-text-muted hover:bg-gray-50 dark:hover:bg-white/5',
                  )}
                >
                  <Mail className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  title={t('moveUp')}
                  aria-label={`${t('moveUp')}: ${option ? authorLabel(option) : entry.authorId}`}
                  disabled={index === 0}
                  onClick={() => setEntries((current) => moveAuthorship(current, index, -1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-text-secondary transition hover:bg-gray-50 disabled:opacity-40 dark:hover:bg-white/5"
                >
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  title={t('moveDown')}
                  aria-label={`${t('moveDown')}: ${option ? authorLabel(option) : entry.authorId}`}
                  disabled={index === entries.length - 1}
                  onClick={() => setEntries((current) => moveAuthorship(current, index, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-text-secondary transition hover:bg-gray-50 disabled:opacity-40 dark:hover:bg-white/5"
                >
                  <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  title={t('removeAuthor')}
                  aria-label={`${t('removeAuthor')}: ${option ? authorLabel(option) : entry.authorId}`}
                  onClick={() => setEntries((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
              </li>
            )
          })}
        </ol>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={pickedAuthorId}
          aria-label={t('selectAuthor')}
          onChange={(event) => setPickedAuthorId(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-bg-surface px-2.5 text-[13px] font-semibold text-text-primary outline-none focus:border-coral-400"
        >
          <option value="">{t('selectAuthor')}</option>
          {remaining.map((option) => (
            <option key={option.id} value={option.id}>
              {authorLabel(option)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addPickedAuthor}
          disabled={!pickedAuthorId}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-text-secondary transition hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          {t('addAuthor')}
        </button>
      </div>

      <button
        type="button"
        disabled={save.isExecuting}
        onClick={() => save.execute({ articleId, authors: entries })}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-coral-500 to-coral-600 text-sm font-bold text-white shadow-[0_8px_18px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105 disabled:opacity-60"
      >
        <Save className="h-4 w-4" strokeWidth={2.2} />
        {t('saveAuthors')}
      </button>
    </CollapsibleCard>
  )
}
