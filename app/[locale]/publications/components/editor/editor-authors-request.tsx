'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { UserPlus, Send } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'
import { canReportIssue, canRequestAuthorList } from '@/lib/publications/editor-mode'
import type { PublicationsBasePath } from '@/lib/publications/base-path'
import { requestAuthorListAction } from '../../actions'
import type { EditorForm, EditorViewer } from '../article/article-page'
import { ReportIssueDialog } from '../article/report-issue-dialog'

export function EditorAuthorsRequest({
  article,
  viewer,
  form,
  editable,
  basePath,
}: {
  article: PublicationEditData
  viewer: EditorViewer
  form: EditorForm
  editable: boolean
  basePath: PublicationsBasePath
}) {
  const t = useTranslations('publications')
  const router = useRouter()
  const alreadyRequested = article.authorRequests.length > 0
  const showRequestButton = canRequestAuthorList({
    isFirstAuthor: viewer.isFirstAuthor,
    basePath,
    status: article.status,
  })
  const signsThePublication = article.authorships.some((authorship) => authorship.author.userId === viewer.userId)
  const showReportButton = canReportIssue({
    signsThePublication,
    isFirstAuthor: viewer.isFirstAuthor,
    basePath,
    status: article.status,
  })

  const request = useAction(requestAuthorListAction, {
    onSuccess() {
      toast.success(t('editor.requestSent'))
      router.refresh()
    },
    onError({ error }) {
      if (error.serverError === 'REQUEST_EXISTS') toast.error(t('editor.alreadyRequested'))
      else toast.error(t('editor.actionError'))
    },
  })

  return (
    <>
      {editable && (
        <div className="mt-5 border-t border-dashed border-line pt-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-coral-50 text-coral-500 dark:bg-coral-500/15 dark:text-coral-300">
              <UserPlus className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">{t('editor.contributorsLabel')}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{t('editor.contributorsHint')}</p>
            </div>
          </div>
          <Textarea
            {...form.register('contributorsNote')}
            rows={3}
            placeholder={t('editor.contributorsPlaceholder')}
            className="mt-3 resize-y"
          />
        </div>
      )}

      {showRequestButton && (
        <>
          <button
            type="button"
            disabled={alreadyRequested || request.isExecuting}
            onClick={() => request.execute({ articleId: article.id, note: form.getValues('contributorsNote').trim() || null })}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-coral-500 to-coral-600 text-sm font-bold text-white shadow-[0_8px_18px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105 disabled:opacity-60"
          >
            <Send className="h-4 w-4" strokeWidth={2.2} />
            {alreadyRequested ? t('editor.alreadyRequested') : t('editor.requestAuthorList')}
          </button>
          <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{t('editor.requestAuthorListHint')}</p>
        </>
      )}

      {showReportButton && <ReportIssueDialog articleId={article.id} />}
    </>
  )
}
