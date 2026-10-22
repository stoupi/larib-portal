'use client'

import { useTranslations } from 'next-intl'
import { Mail, User } from 'lucide-react'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'
import { toExportCandidates } from '@/lib/publications/author-list-export'
import type { PublicationsBasePath } from '@/lib/publications/base-path'
import type { EditorForm, EditorViewer } from '../article/article-page'
import { AuthorListExportDialog } from '../authors/author-list-export-dialog'
import { CollapsibleCard } from './collapsible-card'
import { EditorAuthorsRequest } from './editor-authors-request'

function degreeBadges(degrees: string | null): string[] {
  if (!degrees) return []
  return degrees
    .split(/[,;]/)
    .map((value) => value.trim())
    .filter(Boolean)
}

export function EditorAuthors({
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
  return (
    <CollapsibleCard
      title={
        <>
          <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-coral-600">
            <span className="h-2 w-2 rounded-full bg-coral-500" />
            {t('editor.authorsTitle')}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-extrabold text-text-secondary tabular-nums dark:bg-white/10">
            {article.authorships.length}
          </span>
        </>
      }
      actions={
        article.authorships.length > 0 && (
          <AuthorListExportDialog
            title={form.watch('title')}
            candidates={toExportCandidates(article.authorships)}
          />
        )
      }
    >
      <p className="text-sm text-text-secondary">{t('editor.authorsManagedByAdmin')}</p>

      <ol className="mt-4 space-y-3">
        {article.authorships.map((authorship) => {
          const author = authorship.author
          const isYou = author.userId === viewer.userId
          const affiliationNames = authorship.affiliations
            .map((link) => link.affiliation.centre?.name ?? t('articles.noCentre'))
            .join(' · ')
          return (
            <li key={authorship.order} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[11px] font-bold text-text-secondary tabular-nums dark:bg-white/10">
                {authorship.order}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-text-primary">
                    {author.firstName} {author.lastName.toUpperCase()}
                  </span>
                  {degreeBadges(author.degrees).map((degree) => (
                    <span
                      key={degree}
                      className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-text-secondary dark:bg-white/10"
                    >
                      {degree}
                    </span>
                  ))}
                  {isYou && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-coral-100 bg-coral-50 px-2 py-0.5 text-[10.5px] font-bold text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300">
                      <User className="h-3 w-3" strokeWidth={2.4} />
                      {t('editor.you')}
                    </span>
                  )}
                  {authorship.isCorresponding && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-gray-50 px-2 py-0.5 text-[10.5px] font-bold text-text-secondary dark:bg-white/5">
                      <Mail className="h-3 w-3" strokeWidth={2.2} />
                      {t('editor.corresponding')}
                    </span>
                  )}
                </div>
                {authorship.affiliations.length > 0 && (
                  <span className="mt-0.5 block text-xs text-text-muted">{affiliationNames}</span>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <EditorAuthorsRequest article={article} viewer={viewer} form={form} editable={editable} basePath={basePath} />
    </CollapsibleCard>
  )
}
