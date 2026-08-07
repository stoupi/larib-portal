'use client'

import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { useRouter } from '@/app/i18n/navigation'
import { cn } from '@/lib/utils'
import { publicationsPaths, PUBLICATIONS_BASE, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import { createDraftArticleAction } from '../actions'

export function NewPublicationButton({ compact = false, asAdmin = false }: { compact?: boolean; asAdmin?: boolean }) {
  const t = useTranslations('publications')
  const router = useRouter()
  const { execute, isExecuting } = useAction(createDraftArticleAction, {
    onSuccess({ data }) {
      if (data?.id) {
        const paths = publicationsPaths(asAdmin ? PUBLICATIONS_ADMIN_BASE : PUBLICATIONS_BASE)
        router.push(paths.articleEdit(data.id))
      }
    },
    onError() {
      toast.error(t('editor.actionError'))
    },
  })

  return (
    <button
      type="button"
      disabled={isExecuting}
      onClick={() => execute({ asAdmin })}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-coral-500 to-coral-600 font-bold text-white shadow-[0_8px_18px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105 disabled:opacity-60',
        compact ? 'h-8 px-3 text-[12px]' : 'h-11 px-5 text-sm',
      )}
    >
      <Plus className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2.4} />
      {t('myPub.newPublication')}
    </button>
  )
}
