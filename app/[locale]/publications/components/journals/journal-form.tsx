'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { BookOpen, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useRouter } from '@/app/i18n/navigation'
import { addJournalAction, updateJournalAction, deleteJournalAction } from '../../actions'
import {
  EMPTY_JOURNAL_DRAFT,
  draftToPayload,
  journalToDraft,
  type JournalDraft,
} from '@/lib/publications/journal-draft'
import type { EditableJournal } from '@/lib/services/publications/journals'
import { JournalPreviewCard } from './journal-preview-card'
import { JournalIdentitySection, JournalLookupSection, JournalMetricsSection } from './journal-form-fields'

const JOURNALS_PATH = '/publications/admin/journals'

export function JournalForm({ journal }: { journal: EditableJournal | null }) {
  const t = useTranslations('publications.journals')
  const tActions = useTranslations('publications')
  const router = useRouter()
  const [draft, setDraft] = useState<JournalDraft>(journal ? journalToDraft(journal) : EMPTY_JOURNAL_DRAFT)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { executeAsync: execAdd, isExecuting: adding } = useAction(addJournalAction, {
    onError({ error }) {
      toast.error(error?.serverError === 'JOURNAL_EXISTS' ? t('errorExists') : tActions('actionError'))
    },
  })

  const { executeAsync: execUpdate, isExecuting: updating } = useAction(updateJournalAction, {
    onError({ error }) {
      toast.error(error?.serverError === 'JOURNAL_EXISTS' ? t('errorExists') : tActions('actionError'))
    },
  })

  const { executeAsync: execDelete, isExecuting: deleting } = useAction(deleteJournalAction, {
    onError({ error }) {
      toast.error(error?.serverError === 'JOURNAL_IN_USE' ? t('errorInUse') : tActions('actionError'))
    },
  })

  function backToJournals() {
    router.push(JOURNALS_PATH)
    router.refresh()
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const payload = draftToPayload(draft)
    const result = journal ? await execUpdate({ ...payload, id: journal.id }) : await execAdd(payload)
    if (!result?.data) return
    toast.success(journal ? t('updated') : t('created'))
    backToJournals()
  }

  async function confirmDelete() {
    if (!journal) return
    const result = await execDelete({ id: journal.id })
    setConfirmingDelete(false)
    if (!result?.data) return
    toast.success(t('deleted'))
    backToJournals()
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-5">
        <JournalLookupSection draft={draft} onChange={setDraft} />

        <JournalPreviewCard draft={draft} />

        <JournalIdentitySection draft={draft} onChange={setDraft} />

        <JournalMetricsSection draft={draft} onChange={setDraft} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          {journal ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmingDelete(true)}
              className="gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="size-4" />
              {t('delete')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(JOURNALS_PATH)}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={adding || updating || draft.name.trim().length === 0}
              className="gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105"
            >
              {journal ? <Save className="size-4" /> : <BookOpen className="size-4" />}
              {journal ? t('saveJournal') : t('addJournal')}
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog open={confirmingDelete} onOpenChange={(open) => { if (!open) setConfirmingDelete(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
