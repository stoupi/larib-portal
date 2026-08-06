'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { ARTICLE_SCOPES, type ArticleScopeValue } from '@/lib/publications/article-scope'
import { updateArticleScopeAction } from '../../actions'

export function ArticleScopeSelect({
  articleId,
  articleTitle,
  scope,
}: {
  articleId: string
  articleTitle: string
  scope: ArticleScopeValue
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

  return (
    <select
      value={scope}
      disabled={isExecuting}
      aria-label={`${t('scopeLabel')}: ${articleTitle}`}
      onChange={(event) => execute({ id: articleId, scope: event.target.value as ArticleScopeValue })}
      className="w-full truncate rounded-md border border-line bg-bg-surface px-2 py-1 text-[11.5px] font-bold text-text-secondary transition disabled:opacity-60"
    >
      {ARTICLE_SCOPES.map((value) => (
        <option key={value} value={value}>
          {t(`scope.${value}`)}
        </option>
      ))}
    </select>
  )
}
