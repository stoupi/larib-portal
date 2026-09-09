'use client'

import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function DeleteButton({ name, variables, label, onConfirm }: {
  name: string
  variables: number
  label: string
  onConfirm: () => void
}) {
  const t = useTranslations('corelab.crfEditor')
  const words = useTranslations('corelab.crf')
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex size-5 cursor-pointer items-center justify-center rounded-md border border-line bg-white text-text-secondary hover:border-danger-500 hover:text-danger-600"
        >
          <Trash2 className="size-3" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(event) => event.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteTitle', { name })}</AlertDialogTitle>
          <AlertDialogDescription>{t('deleteBody', { count: variables })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{words('cancel')}</AlertDialogCancel>
          <AlertDialogAction className="bg-danger-600 text-white hover:bg-danger-700" onClick={onConfirm}>
            {t('confirmDelete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
