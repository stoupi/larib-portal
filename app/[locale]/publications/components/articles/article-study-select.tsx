'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import type { StudyOption } from '@/lib/services/publications/studies'
import { updateArticleStudyAction } from '../../actions'

export function ArticleStudySelect({
  articleId,
  articleTitle,
  studyId,
  studyOptions,
}: {
  articleId: string
  articleTitle: string
  studyId: string | null
  studyOptions: StudyOption[]
}) {
  const t = useTranslations('publications.articles')
  const router = useRouter()
  const { execute, isExecuting } = useAction(updateArticleStudyAction, {
    onSuccess() {
      toast.success(t('studySaved'))
      router.refresh()
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  return (
    <select
      value={studyId ?? ''}
      disabled={isExecuting}
      aria-label={`${t('assignStudy')}: ${articleTitle}`}
      onChange={(event) => execute({ id: articleId, studyId: event.target.value || null })}
      className="w-full truncate rounded-md border border-coral-100 bg-coral-50 px-2 py-1 text-[11.5px] font-bold text-coral-600 transition disabled:opacity-60 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300"
    >
      <option value="">{t('noStudy')}</option>
      {studyOptions.map((study) => (
        <option key={study.id} value={study.id}>
          {study.label}
        </option>
      ))}
    </select>
  )
}
