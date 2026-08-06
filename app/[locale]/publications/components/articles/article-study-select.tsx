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
      className="w-full truncate rounded-md border border-[#DDD6FE] bg-[#F5F3FF] px-2 py-1 text-[11.5px] font-bold text-[#6D28D9] transition disabled:opacity-60 dark:border-[rgba(139,92,246,0.32)] dark:bg-[rgba(139,92,246,0.16)] dark:text-[#C4B5FD]"
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
