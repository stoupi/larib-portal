'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Plus, Save } from 'lucide-react'
import type { PickerAuthor } from '@/lib/publications/author-picker'
import { markCorresponding } from '@/lib/publications/corresponding-author'
import type { AuthorshipEntry } from '@/lib/publications/author-list'
import { authorshipAffiliationTexts, type ExportableAuthor } from '@/lib/publications/author-list-export'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'
import { setArticleAuthorsAction } from '../../actions'
import { AuthorPickerDialog } from '../authors/author-picker-dialog'
import { AuthorListExportDialog } from '../authors/author-list-export-dialog'
import { AuthorOrderList } from '../authors/author-order-list'
import { CollapsibleCard } from './collapsible-card'

export function EditorAuthorsAdmin({
  article,
  pickerAuthors,
  centres,
  editable,
}: {
  article: PublicationEditData
  pickerAuthors: PickerAuthor[]
  centres: { id: string; name: string; city: string | null; isOwn: boolean }[]
  editable: boolean
}) {
  const t = useTranslations('publications.editor')
  const router = useRouter()
  const [entries, setEntries] = useState<AuthorshipEntry[]>(() =>
    article.authorships.map((authorship) => ({
      authorId: authorship.author.id,
      isCorresponding: authorship.isCorresponding,
    })),
  )
  const [pickerOpen, setPickerOpen] = useState(false)

  const save = useAction(setArticleAuthorsAction, {
    onSuccess() {
      toast.success(t('authorsSaved'))
      router.refresh()
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  const authorsById = useMemo(
    () => new Map(pickerAuthors.map((author) => [author.id, author])),
    [pickerAuthors],
  )

  const affiliationsByAuthorId = useMemo(
    () =>
      new Map(
        article.authorships.map((authorship) => [
          authorship.author.id,
          authorshipAffiliationTexts(authorship),
        ]),
      ),
    [article.authorships],
  )

  const exportableAuthors: ExportableAuthor[] = entries.flatMap((entry) => {
    const author = authorsById.get(entry.authorId)
    if (!author) return []
    const storedAffiliations = affiliationsByAuthorId.get(entry.authorId) ?? []
    const centreFallback = author.centreName ? [author.centreName] : []
    return [
      {
        firstName: author.firstName,
        lastName: author.lastName,
        degrees: author.degrees,
        affiliations: storedAffiliations.length > 0 ? storedAffiliations : centreFallback,
      },
    ]
  })

  function addAuthors(authorIds: string[]) {
    setEntries((current) => [
      ...current,
      ...authorIds
        .filter((authorId) => !current.some((entry) => entry.authorId === authorId))
        .map((authorId) => ({ authorId, isCorresponding: false })),
    ])
  }

  function toggleCorresponding(authorId: string) {
    setEntries((current) => markCorresponding(current, authorId))
  }

  function removeAuthor(authorId: string) {
    setEntries((current) => current.filter((entry) => entry.authorId !== authorId))
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
      actions={
        exportableAuthors.length > 0 && (
          <AuthorListExportDialog title={article.title} authors={exportableAuthors} />
        )
      }
    >
      <p className="text-sm text-text-secondary">{t('authorsAdminHint')}</p>

      {entries.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-text-muted">
          {t('noAuthorYet')}
        </p>
      ) : (
        <div className="mt-4">
          <AuthorOrderList
            entries={entries}
            authorsById={authorsById}
            onReorder={setEntries}
            onToggleCorresponding={toggleCorresponding}
            onRemove={removeAuthor}
            editable={editable}
          />
        </div>
      )}

      {editable && (
        <>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            {t('picker.title')}
          </button>
          <AuthorPickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            authors={pickerAuthors}
            centres={centres}
            alreadyAddedIds={entries.map((entry) => entry.authorId)}
            onConfirm={addAuthors}
          />
          <button
            type="button"
            disabled={save.isExecuting}
            onClick={() => save.execute({ articleId: article.id, authors: entries })}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-coral-500 to-coral-600 text-sm font-bold text-white shadow-[0_8px_18px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105 disabled:opacity-60"
          >
            <Save className="h-4 w-4" strokeWidth={2.2} />
            {t('saveAuthors')}
          </button>
        </>
      )}
    </CollapsibleCard>
  )
}
