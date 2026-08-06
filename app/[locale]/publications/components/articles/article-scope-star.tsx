'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ArticleScopeValue } from '@/lib/publications/article-scope'
import { updateArticleScopeAction } from '../../actions'

function starClassName(scope: ArticleScopeValue): string {
  return scope === 'LARIB_TEAM'
    ? 'fill-coral-500 text-coral-500'
    : 'fill-none text-text-muted'
}

function labelClassName(scope: ArticleScopeValue): string {
  return scope === 'LARIB_TEAM' ? 'text-coral-600' : 'text-text-muted'
}

export function ArticleScopeStar({
  articleId,
  articleTitle,
  scope,
  editable = false,
}: {
  articleId: string
  articleTitle: string
  scope: ArticleScopeValue
  editable?: boolean
}) {
  const t = useTranslations('publications.articles')
  const router = useRouter()
  const { execute, isExecuting } = useAction(updateArticleScopeAction, {
    onSuccess() {
      toast.success(t('scopeSaved'))
      router.refresh()
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  const tooltip = t(`scopeTooltip.${scope}`)

  if (!editable) {
    return (
      <span
        title={tooltip}
        aria-label={`${tooltip}: ${articleTitle}`}
        className="inline-flex flex-col items-center gap-0.5"
      >
        <Star className={cn('size-4', starClassName(scope))} strokeWidth={2} />
        <span className={cn('text-[9px] font-extrabold uppercase tracking-wide', labelClassName(scope))}>
          {t('scopeShortLabel')}
        </span>
      </span>
    )
  }

  return (
    <button
      type="button"
      title={tooltip}
      aria-label={`${t('scopeLabel')}: ${articleTitle}`}
      aria-pressed={scope === 'LARIB_TEAM'}
      disabled={isExecuting}
      onClick={() =>
        execute({ id: articleId, scope: scope === 'LARIB_TEAM' ? 'OUTSIDE_TEAM' : 'LARIB_TEAM' })
      }
      className="inline-flex w-10 flex-col items-center gap-0.5 rounded-lg py-1 transition hover:bg-gray-50 disabled:opacity-60 dark:hover:bg-white/5"
    >
      <Star className={cn('size-4', starClassName(scope))} strokeWidth={2} />
      <span className={cn('text-[9px] font-extrabold uppercase tracking-wide', labelClassName(scope))}>
        {t('scopeShortLabel')}
      </span>
    </button>
  )
}
