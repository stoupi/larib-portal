'use client'

import { useTranslations } from 'next-intl'
import { AlertTriangle, ArrowLeft, Ban, Download } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import { cn } from '@/lib/utils'
import { publicationsPaths, type PublicationsBasePath } from '@/lib/publications/base-path'
import type { ImportableDraftField } from '@/lib/publications/pubmed-import'
import type { PubmedRecordPreview } from '@/lib/services/publications/pubmed-search'

const CORAL_BUTTON_CLASS =
  'inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-b from-coral-500 to-coral-600 px-4 text-sm font-bold text-white shadow-[0_8px_18px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105 disabled:opacity-50'

function NoticeBox({ tone, icon, title, children }: { tone: 'amber' | 'danger'; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'space-y-1 rounded-xl border p-3 text-sm',
        tone === 'amber'
          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
          : 'border-danger-100 bg-danger-50 text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-100',
      )}
    >
      <p className="flex items-center gap-2 font-bold">
        {icon}
        {title}
      </p>
      <div className="pl-6">{children}</div>
    </div>
  )
}

export function PubmedImportPreview({
  preview,
  decision,
  basePath,
  onBack,
  onConfirm,
}: {
  preview: PubmedRecordPreview
  decision: {
    blockedAsNonAuthor: boolean
    conflictingArticleId: string | null
    replacedFields: ImportableDraftField[]
    isImporting: boolean
  }
  basePath: PublicationsBasePath
  onBack: () => void
  onConfirm: () => void
}) {
  const t = useTranslations('publications.pubmedImport')
  const paths = publicationsPaths(basePath)
  const isBlocked = decision.conflictingArticleId !== null || decision.blockedAsNonAuthor

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
        {t('back')}
      </button>

      <div className="space-y-1">
        <h3 className="text-lg font-bold leading-snug text-text-primary">{preview.title}</h3>
        <p className="text-sm text-text-secondary">
          {[preview.journalName, preview.year, preview.doi && `DOI ${preview.doi}`, `PMID ${preview.pmid}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">{t('authorsLabel')}</p>
        <p className="text-sm leading-relaxed">
          {preview.authors.map((author, index) => (
            <span key={`${author.name}-${index}`}>
              <span
                className={cn(
                  author.team ? 'font-bold text-coral-600 dark:text-coral-300' : 'text-text-secondary',
                  author.isViewer && 'rounded bg-coral-50 px-1 font-bold text-coral-700 dark:bg-coral-500/20 dark:text-coral-200',
                )}
              >
                {author.name}
                {author.isViewer && <span className="ml-1 text-[10px] uppercase tracking-wide">({t('you')})</span>}
              </span>
              {index < preview.authors.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      </div>

      <p className="max-h-40 overflow-y-auto text-sm leading-relaxed text-text-secondary">
        {preview.abstract || t('noAbstract')}
      </p>

      {decision.conflictingArticleId && (
        <NoticeBox tone="amber" icon={<AlertTriangle className="h-4 w-4" strokeWidth={2.4} />} title={t('alreadyInAppTitle')}>
          <p>{t('alreadyInAppBody')}</p>
          <Link
            href={paths.article(decision.conflictingArticleId)}
            className="mt-1 inline-block font-bold underline"
          >
            {t('openExisting')}
          </Link>
        </NoticeBox>
      )}

      {decision.blockedAsNonAuthor && (
        <NoticeBox tone="danger" icon={<Ban className="h-4 w-4" strokeWidth={2.4} />} title={t('notAuthorTitle')}>
          <p>{t('notAuthorBody')}</p>
        </NoticeBox>
      )}

      {!isBlocked && decision.replacedFields.length > 0 && (
        <NoticeBox tone="amber" icon={<AlertTriangle className="h-4 w-4" strokeWidth={2.4} />} title={t('willReplaceTitle')}>
          <p>{t('willReplaceBody', { fields: decision.replacedFields.map((field) => t(`field.${field}`)).join(', ') })}</p>
        </NoticeBox>
      )}

      {!isBlocked && (
        <div className="flex justify-end">
          <button type="button" onClick={onConfirm} disabled={decision.isImporting} className={CORAL_BUTTON_CLASS}>
            <Download className="h-4 w-4" strokeWidth={2.2} />
            {decision.isImporting
              ? t('importing')
              : decision.replacedFields.length > 0
                ? t('confirmReplace')
                : t('confirmImport')}
          </button>
        </div>
      )}
    </div>
  )
}
