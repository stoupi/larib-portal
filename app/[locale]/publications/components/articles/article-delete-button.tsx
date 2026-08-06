'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
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
} from '@/components/ui/alert-dialog'
import { deleteArticleAction } from '../../actions'

export function ArticleDeleteButton({ articleId, articleTitle }: { articleId: string; articleTitle: string }) {
  const t = useTranslations('publications.articles')
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)

  const remove = useAction(deleteArticleAction, {
    onSuccess() {
      toast.success(t('articleDeleted'))
      setConfirming(false)
      router.refresh()
    },
    onError() {
      toast.error(t('actionError'))
      setConfirming(false)
    },
  })

  return (
    <>
      <button
        type="button"
        title={t('deleteArticle')}
        aria-label={`${t('deleteArticle')}: ${articleTitle}`}
        onClick={() => setConfirming(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-text-secondary transition hover:bg-coral-50 hover:text-coral-600 dark:hover:bg-white/5 dark:hover:text-coral-300"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      <AlertDialog open={confirming} onOpenChange={(open) => !open && setConfirming(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteArticle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteArticleConfirm', { title: articleTitle })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction disabled={remove.isExecuting} onClick={() => remove.execute({ id: articleId })}>
              {t('deleteArticle')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
