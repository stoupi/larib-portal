'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ArticleScopeValue } from '@/lib/publications/article-scope'
import { updateArticleScopeAction } from '../../actions'

const TRACK_SIZE: Record<'sm' | 'lg', string> = {
  sm: 'h-5 w-9',
  lg: 'h-7 w-12',
}

const THUMB_SIZE: Record<'sm' | 'lg', string> = {
  sm: 'size-4',
  lg: 'size-6',
}

const THUMB_TRAVEL: Record<'sm' | 'lg', string> = {
  sm: 'translate-x-4',
  lg: 'translate-x-5',
}

export function ScopePill({ checked, size }: { checked: boolean; size: 'sm' | 'lg' }) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full border transition-colors',
        TRACK_SIZE[size],
        checked
          ? 'border-coral-600 bg-gradient-to-b from-coral-500 to-coral-600'
          : 'border-line bg-gray-200 dark:bg-white/15',
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 rounded-full bg-white shadow-sm transition-transform',
          THUMB_SIZE[size],
          checked && THUMB_TRAVEL[size],
        )}
      />
    </span>
  )
}

export function ArticleScopeSwitch({
  articleId,
  articleTitle,
  scope,
  editable = false,
  size = 'sm',
}: {
  articleId: string
  articleTitle: string
  scope: ArticleScopeValue
  editable?: boolean
  size?: 'sm' | 'lg'
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

  const checked = scope === 'LARIB_TEAM'
  const tooltip = t(`scopeTooltip.${scope}`)

  if (!editable) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span aria-label={`${tooltip}: ${articleTitle}`} className="inline-flex">
            <ScopePill checked={checked} size={size} />
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${t('scopeLabel')}: ${articleTitle}`}
          aria-pressed={checked}
          disabled={isExecuting}
          onClick={() => execute({ id: articleId, scope: checked ? 'OUTSIDE_TEAM' : 'LARIB_TEAM' })}
          className="inline-flex disabled:opacity-60"
        >
          <ScopePill checked={checked} size={size} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
