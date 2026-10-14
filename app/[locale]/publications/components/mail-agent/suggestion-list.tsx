'use client'

import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { useRouter } from '@/app/i18n/navigation'
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import type { DashboardArticleItem } from '@/lib/publications/admin-dashboard'
import type { MailSuggestionRow } from '@/lib/services/publications/mail-suggestions'
import {
  applyMailSuggestionAction,
  createArticleFromMailSuggestionAction,
  dismissMailSuggestionAction,
} from '../../mail-agent-actions'
import { SuggestionCard } from './suggestion-card'

const ADMIN_PATHS = publicationsPaths(PUBLICATIONS_ADMIN_BASE)

type SuggestionListProps = {
  suggestions: MailSuggestionRow[]
  articles: DashboardArticleItem[]
}

export function SuggestionList({ suggestions, articles }: SuggestionListProps) {
  const t = useTranslations('publications')
  const router = useRouter()

  const reportError = ({ error }: { error: { serverError?: string } }) => {
    toast.error(error.serverError === 'SUGGESTION_NOT_PENDING' ? t('mailAgent.notPending') : t('actionError'))
    router.refresh()
  }

  const apply = useAction(applyMailSuggestionAction, {
    onSuccess() {
      toast.success(t('mailAgent.applied'))
      router.refresh()
    },
    onError: reportError,
  })
  const create = useAction(createArticleFromMailSuggestionAction, {
    onSuccess({ data }) {
      const articleId = data?.articleId
      toast.success(t('mailAgent.created'), {
        action: articleId
          ? { label: t('mailAgent.openArticle'), onClick: () => router.push(ADMIN_PATHS.articleEdit(articleId)) }
          : undefined,
      })
      router.refresh()
    },
    onError: reportError,
  })
  const dismiss = useAction(dismissMailSuggestionAction, {
    onSuccess() {
      toast.success(t('mailAgent.dismissed'))
      router.refresh()
    },
    onError: reportError,
  })

  if (suggestions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-base text-text-primary">
        {t('mailAgent.pendingEmpty')}
      </p>
    )
  }

  const review = {
    busy: apply.isExecuting || create.isExecuting || dismiss.isExecuting,
    apply: apply.execute,
    create: create.execute,
    dismiss: dismiss.execute,
  }

  return (
    <ul className="space-y-4">
      {suggestions.map((suggestion) => (
        <SuggestionCard key={suggestion.id} suggestion={suggestion} articles={articles} review={review} />
      ))}
    </ul>
  )
}
