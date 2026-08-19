'use client'

import { useRef, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Save, ChevronRight } from 'lucide-react'
import { Link, useRouter } from '@/app/i18n/navigation'
import { cn } from '@/lib/utils'
import { ARTICLE_STATUSES } from '@/lib/services/publications/articles'
import { ARTICLE_TYPE_VALUES, normalizeArticleType } from '@/lib/publications/article-type'
import { isDraftDeletable } from '@/lib/publications/editor-logic'
import {
  computeEditorVisibility,
  canComposeAuthorList,
  canEditArticle,
  type EditorMode,
} from '@/lib/publications/editor-mode'
import { PUBLICATIONS_ADMIN_BASE, type PublicationsBasePath } from '@/lib/publications/base-path'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'
import type { JournalTargetItem } from '@/lib/services/publications/journal-targets'
import type { StudyOption } from '@/lib/services/publications/studies'
import type { PickerAuthor } from '@/lib/publications/author-picker'
import { updateArticleCoreAction, deleteDraftArticleAction } from '../../actions'
import { EditorHeader } from '../editor/editor-header'
import { EditorAuthors } from '../editor/editor-authors'
import { EditorAuthorsAdmin } from '../editor/editor-authors-admin'
import { EditorReferences } from '../editor/editor-references'
import { EditorSubmissions } from '../editor/editor-submissions'
import { EditorJournalQueue } from '../editor/editor-journal-queue'
import { EditorPdf } from '../editor/editor-pdf'
import { PubmedImportDialog } from '../pubmed-import/pubmed-import-dialog'
import type { DraftSummary } from '@/lib/publications/pubmed-import'
import { ArticleReadingHeader } from './article-reading-header'
import { ArticleAbstractTimeline } from './article-abstract-timeline'
import { CarouselEmailDialog, useCarouselEmailDialog } from './carousel-email-dialog'
import { CommunicationCard } from '../communication/communication-card'
import { COMMUNICATION_STATUSES } from '@/lib/publications/communication'

const FormSchema = z.object({
  title: z.string(),
  type: z.enum(ARTICLE_TYPE_VALUES),
  status: z.enum(ARTICLE_STATUSES),
  studyId: z.string(),
  pubmedId: z.string(),
  doi: z.string(),
  contributorsNote: z.string(),
})

export type EditorFormValues = z.infer<typeof FormSchema>
export type EditorForm = UseFormReturn<EditorFormValues>
export type EditorViewer = { userId: string; isFirstAuthor: boolean; isAdmin: boolean }

export type EditorOptions = {
  journalTargets: JournalTargetItem[]
  studyOptions: StudyOption[]
  journalNames: string[]
  pickerAuthors: PickerAuthor[]
  centres: { id: string; name: string; city: string | null; isOwn: boolean }[]
}

export function ArticlePage({
  locale,
  article,
  options,
  viewer,
  basePath,
}: {
  locale: string
  article: PublicationEditData
  options: EditorOptions
  viewer: EditorViewer
  basePath: PublicationsBasePath
}) {
  const { journalTargets, studyOptions, journalNames, pickerAuthors, centres } = options
  const t = useTranslations('publications')
  const router = useRouter()
  const searchParams = useSearchParams()
  const backHref = basePath
  const canEdit = canEditArticle({ isAdmin: viewer.isAdmin, isFirstAuthor: viewer.isFirstAuthor, basePath })

  const [mode, setMode] = useState<EditorMode>(searchParams.get('mode') === 'edit' ? 'edit' : 'read')
  const visibility = computeEditorVisibility({ canEdit, mode })

  const defaults: EditorFormValues = {
    title: article.title,
    type: normalizeArticleType(article.type),
    status: article.status,
    studyId: article.studyId ?? '',
    pubmedId: article.pubmedId ?? '',
    doi: article.doi ?? '',
    contributorsNote: article.contributorsNote ?? '',
  }
  const form = useForm<EditorFormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaults })
  const { isDirty } = form.formState

  const carouselDialog = useCarouselEmailDialog()
  const persistedStatus = useRef(article.status)
  const showCommunicationCard =
    basePath === PUBLICATIONS_ADMIN_BASE && viewer.isAdmin && COMMUNICATION_STATUSES.includes(article.status)

  const save = useAction(updateArticleCoreAction, {
    onSuccess() {
      toast.success(t('editor.saved'))
      const savedStatus = form.getValues('status')
      if (viewer.isAdmin && persistedStatus.current !== 'ACCEPTED' && savedStatus === 'ACCEPTED') {
        carouselDialog.openFor(article.id)
      }
      persistedStatus.current = savedStatus
      form.reset(form.getValues())
      router.refresh()
    },
    onError() {
      toast.error(t('editor.actionError'))
    },
  })

  const removeDraft = useAction(deleteDraftArticleAction, {
    onSuccess() {
      toast.success(t('editor.deleted'))
      router.push(backHref)
    },
    onError() {
      toast.error(t('editor.actionError'))
    },
  })

  const onSave = form.handleSubmit((values) => {
    save.execute({
      id: article.id,
      title: values.title.trim(),
      type: values.type,
      status: values.status,
      studyId: values.studyId || null,
      pubmedId: values.pubmedId.trim() || null,
      doi: values.doi.trim() || null,
      contributorsNote: values.contributorsNote.trim() || null,
    })
  })

  const draftSummary: DraftSummary = {
    title: article.title,
    journalName: article.publishedJournal?.name ?? null,
    doi: article.doi,
    abstract: article.abstract,
    otherAuthorCount: article.authorships.filter((authorship) => authorship.author.userId !== viewer.userId).length,
    publishedAt: article.publishedAt ? article.publishedAt.toISOString().slice(0, 10) : null,
  }

  function onDiscard() {
    if (isDirty) {
      form.reset(defaults)
      setMode('read')
      return
    }
    if (isDraftDeletable(article.title, article.status)) {
      removeDraft.execute({ id: article.id })
      return
    }
    setMode('read')
  }

  return (
    <div className="app-gradient min-h-full px-4 py-6 md:px-8">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap items-center gap-1.5 text-sm">
            <Link href={backHref} className="font-semibold text-text-secondary hover:underline">
              {basePath === PUBLICATIONS_ADMIN_BASE ? t('adminHome.title') : t('title')}
            </Link>
            <ChevronRight className="h-4 w-4 text-text-muted" />
            <span className="font-semibold text-text-primary">{article.title || t('myPub.untitled')}</span>
            {visibility.showSaveBar && isDirty && (
              <span className="ml-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#B45309] dark:text-[#FBBF24]">
                <span className="h-2 w-2 rounded-full bg-current" />
                {t('editor.unsavedChanges')}
              </span>
            )}
          </nav>
          {visibility.showSaveBar && (
            <div className="flex items-center gap-2.5">
              <PubmedImportDialog
                target={{ mode: 'fill', articleId: article.id, draft: draftSummary }}
                basePath={basePath}
                isAdmin={viewer.isAdmin}
              />
              <button
                type="button"
                onClick={onDiscard}
                disabled={removeDraft.isExecuting}
                className="inline-flex h-11 items-center rounded-xl border border-line bg-bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5"
              >
                {t('editor.discard')}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={save.isExecuting || !isDirty}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-coral-500 to-coral-600 px-5 text-sm font-bold text-white shadow-[0_8px_18px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105 disabled:opacity-50"
              >
                <Save className="h-4 w-4" strokeWidth={2.2} />
                {t('editor.save')}
              </button>
            </div>
          )}
        </div>

        {visibility.showSaveBar ? (
          <EditorHeader article={article} viewer={viewer} form={form} studyOptions={studyOptions} />
        ) : (
          <ArticleReadingHeader
            article={article}
            studyOptions={studyOptions}
            showEditButton={visibility.showEditButton}
            onEdit={() => setMode('edit')}
          />
        )}

        <div className={cn('grid grid-cols-1 gap-5 lg:grid-cols-2')}>
          <div className="space-y-5">
            {canComposeAuthorList({ isAdmin: viewer.isAdmin, basePath }) ? (
              <EditorAuthorsAdmin
                article={article}
                pickerAuthors={pickerAuthors}
                centres={centres}
                editable={visibility.cardsEditable}
              />
            ) : (
              <EditorAuthors article={article} viewer={viewer} form={form} editable={visibility.cardsEditable} />
            )}
            <ArticleAbstractTimeline article={article} locale={locale} />
            <EditorReferences form={form} studyOptions={studyOptions} editable={visibility.cardsEditable} />
          </div>
          <div className="space-y-5">
            <EditorSubmissions
              articleId={article.id}
              submissions={article.submissions}
              locale={locale}
              journalNames={journalNames}
              editable={visibility.cardsEditable}
            />
            <EditorPdf
              article={{
                id: article.id,
                pdfUrl: article.pdfUrl,
                status: article.status,
                doi: article.doi,
                pubmedId: article.pubmedId,
              }}
              editable={visibility.cardsEditable}
            />
            {showCommunicationCard && (
              <CommunicationCard
                articleId={article.id}
                carouselEmailSentAt={article.carouselEmailSentAt}
                locale={locale}
                controller={carouselDialog}
              />
            )}
            <EditorJournalQueue targets={journalTargets} />
          </div>
        </div>
      </div>
      <CarouselEmailDialog controller={carouselDialog} />
    </div>
  )
}
