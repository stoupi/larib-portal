'use client'

import { useTranslations } from 'next-intl'
import { Pencil, FileText, ExternalLink } from 'lucide-react'
import { pillClassName, ARTICLE_STATUS_TONE } from '@/lib/publications/status-display'
import { ARTICLE_TYPE_BADGE, normalizeArticleType } from '@/lib/publications/article-type'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'
import type { StudyOption } from '@/lib/services/publications/studies'
import { ArticleScopeSwitch } from '../articles/article-scope-switch'
import { doiUrl } from '@/lib/publications/doi'

export function ArticleReadingHeader({
  article,
  studyOptions,
  showEditButton,
  onEdit,
}: {
  article: PublicationEditData
  studyOptions: StudyOption[]
  showEditButton: boolean
  onEdit: () => void
}) {
  const t = useTranslations('publications')
  const tArticles = useTranslations('publications.articles')
  const studyLabel = studyOptions.find((option) => option.id === article.studyId)?.label ?? null
  const year = article.publishedAt ? new Date(article.publishedAt).getUTCFullYear() : null
  const displayType = normalizeArticleType(article.type)

  return (
    <div className="rounded-2xl border border-line bg-bg-surface p-6 shadow-elevation-xs">
      <div className="flex items-stretch gap-4">
        <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${ARTICLE_TYPE_BADGE[displayType]}`}
            >
              {t(`myPub.type.${displayType}`)}
            </span>
            <span className={pillClassName(ARTICLE_STATUS_TONE[article.status])}>{t(`articles.status.${article.status}`)}</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                {tArticles('scopeShortLabel')}
              </span>
              <ArticleScopeSwitch articleId={article.id} articleTitle={article.title || t('myPub.untitled')} scope={article.scope} size="sm" />
            </span>
            {year && <span className="text-sm font-bold text-text-secondary tabular-nums">{year}</span>}
            {studyLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-coral-100 bg-coral-50 px-3 py-1 text-[11.5px] font-bold text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300">
                {t('editor.studyChip', { study: studyLabel })}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-text-primary md:text-3xl">
            {article.title || t('myPub.untitled')}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {article.pubmedId && (
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${article.pubmedId}/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-navy-600 transition hover:bg-gray-50 dark:text-navy-300 dark:hover:bg-white/5"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} />
                {tArticles('openPubmed')}
              </a>
            )}
            {article.doi && (
              <a
                href={doiUrl(article.doi) ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-navy-600 transition hover:bg-gray-50 dark:text-navy-300 dark:hover:bg-white/5"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} />
                {tArticles('openDoi')}
              </a>
            )}
            {article.pdfUrl && (
              <a
                href={article.pdfUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-navy-600 transition hover:bg-gray-50 dark:text-navy-300 dark:hover:bg-white/5"
              >
                <FileText className="h-3.5 w-3.5" strokeWidth={2.2} />
                {tArticles('downloadPdf')}
              </a>
            )}
            {showEditButton && (
              <button
                type="button"
                onClick={onEdit}
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-b from-coral-500 to-coral-600 px-3.5 text-[13px] font-bold text-white shadow-[0_6px_14px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                {t('editor.editButton')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
