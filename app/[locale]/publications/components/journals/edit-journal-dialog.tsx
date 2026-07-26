'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { updateJournalAction, deleteJournalAction } from '../../actions'
import type { JournalMetrics } from '@/lib/publications/journal-metrics'
import { isJournalSpecialty, keepSubSpecialty } from '@/lib/publications/journal-taxonomy'

const FormSchema = z.object({
  name: z.string().min(1),
  issn: z.string().optional(),
  publisher: z.string().optional(),
  impactFactor: z.string().optional(),
  sjr: z.string().optional(),
  url: z.string().optional(),
})
type FormValues = z.infer<typeof FormSchema>

function toNumber(value: string | undefined): number | null {
  const trimmed = value?.trim()
  return trimmed ? Number(trimmed) : null
}

export function EditJournalDialog({ journal, onClose }: { journal: JournalMetrics | null; onClose: () => void }) {
  const t = useTranslations('publications')
  const router = useRouter()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    values: {
      name: journal?.name ?? '',
      issn: journal?.issn ?? '',
      publisher: journal?.publisher ?? '',
      impactFactor: journal?.impactFactor != null ? String(journal.impactFactor) : '',
      sjr: journal?.sjr != null ? String(journal.sjr) : '',
      url: journal?.url ?? '',
    },
  })

  const { executeAsync: execUpdate, isExecuting: saving } = useAction(updateJournalAction, {
    onError() {
      toast.error(t('actionError'))
    },
  })
  const { executeAsync: execDelete, isExecuting: deleting } = useAction(deleteJournalAction, {
    onError({ error }) {
      toast.error(error?.serverError === 'JOURNAL_IN_USE' ? t('journals.errorInUse') : t('actionError'))
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (!journal) return
    const result = await execUpdate({
      id: journal.id,
      name: values.name.trim(),
      issn: values.issn?.trim() || null,
      publisher: values.publisher?.trim() || null,
      impactFactor: toNumber(values.impactFactor),
      sjr: toNumber(values.sjr),
      url: values.url?.trim() || null,
      abbreviation: journal.abbreviation,
      specialty: isJournalSpecialty(journal.specialty) ? journal.specialty : null,
      subSpecialty: keepSubSpecialty(
        isJournalSpecialty(journal.specialty) ? journal.specialty : null,
        journal.subSpecialty,
      ),
      openAccess: journal.openAccess,
      typicalDelayDays: journal.typicalDelayDays,
    })
    if (!result?.data) return
    toast.success(t('journals.updated'))
    onClose()
    router.refresh()
  })

  async function confirmDelete() {
    if (!journal) return
    const result = await execDelete({ id: journal.id })
    setConfirmingDelete(false)
    if (!result?.data) return
    toast.success(t('journals.deleted'))
    onClose()
    router.refresh()
  }

  return (
    <>
      <Dialog open={journal !== null} onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('journals.editTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-text-secondary">{t('journals.name')}</label>
              <Input required {...register('name')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-text-secondary">{t('journals.issn')}</label>
                <Input {...register('issn')} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-text-secondary">{t('journals.publisher')}</label>
                <Input {...register('publisher')} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-text-secondary">{t('journals.impactFactor')}</label>
                <Input type="number" step="0.001" {...register('impactFactor')} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-text-secondary">{t('journals.sjr')}</label>
                <Input type="number" step="0.001" {...register('sjr')} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-text-secondary">{t('journals.url')}</label>
              <Input {...register('url')} />
            </div>
            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingDelete(true)}
                className="gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="size-4" />
                {t('journals.delete')}
              </Button>
              <span className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  {t('journals.cancel')}
                </Button>
                <Button type="submit" disabled={saving}>
                  {t('journals.save')}
                </Button>
              </span>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmingDelete} onOpenChange={(open) => { if (!open) setConfirmingDelete(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('journals.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('journals.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('journals.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {t('journals.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
