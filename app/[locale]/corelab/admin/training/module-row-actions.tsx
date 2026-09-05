'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { archiveModuleAction, updateModuleAction } from '../actions-training'

type Module = { id: string; title: string; description: string; durationMinutes: number; order: number }

export function ModuleRowActions({ module }: { module: Module }) {
  const t = useTranslations('corelab.training.admin')
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    title: module.title,
    description: module.description,
    durationMinutes: String(module.durationMinutes),
    order: String(module.order),
  })

  const update = useAction(updateModuleAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      setEditing(false)
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  const archive = useAction(archiveModuleAction, {
    onSuccess: () => {
      toast.success(t('archived'))
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>{t('edit')}</Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm">{t('archive')}</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('archive')}</AlertDialogTitle>
            <AlertDialogDescription>{t('archiveConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => archive.execute({ moduleId: module.id })}>{t('archive')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edit')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`module-title-${module.id}`}>{t('moduleTitle')}</Label>
              <Input
                id={`module-title-${module.id}`}
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`module-description-${module.id}`}>{t('description')}</Label>
              <Input
                id={`module-description-${module.id}`}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`module-duration-${module.id}`}>{t('duration')}</Label>
                <Input
                  id={`module-duration-${module.id}`}
                  type="number"
                  value={draft.durationMinutes}
                  onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`module-order-${module.id}`}>{t('order')}</Label>
                <Input
                  id={`module-order-${module.id}`}
                  type="number"
                  value={draft.order}
                  onChange={(event) => setDraft({ ...draft, order: event.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => update.execute({
                moduleId: module.id,
                title: draft.title.trim(),
                description: draft.description.trim(),
                durationMinutes: Number(draft.durationMinutes),
                order: Number(draft.order),
              })}
            >
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
