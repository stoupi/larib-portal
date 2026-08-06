'use client'

import { useTranslations } from 'next-intl'
import { ArrowUp, ArrowUpDown, ChevronRight, Clock, ExternalLink, FileText, Pencil } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import { cn } from '@/lib/utils'
import { ARTICLE_STATUS_TONE, pillClassName } from '@/lib/publications/status-display'
import { ARTICLE_TYPE_BADGE } from '@/lib/publications/article-type'
import type { DashboardArticleItem } from '@/lib/publications/admin-dashboard'
import { ARTICLE_SORT_KEYS, type ArticleSort, type ArticleSortKey } from '@/lib/publications/article-sort'
import type { StudyOption } from '@/lib/services/publications/studies'
import { SubmissionHistory } from '../submission-history'
import { ArticleStudySelect } from './article-study-select'
import { ArticleScopeSwitch } from './article-scope-switch'
import { ArticleDeleteButton } from './article-delete-button'

export const ARTICLES_GRID =
  'grid grid-cols-[minmax(240px,1fr)_150px_128px_72px_128px_176px_132px] items-center gap-3.5'

export type ArticleRowExpansion = {
  open: boolean
  onToggle: () => void
  journalNames: string[]
}

function AuthorLine({ authors }: { authors: { id: string; name: string }[] }) {
  if (authors.length === 0) return null
  return (
    <div className="mt-1 min-w-0 truncate text-[11.5px] leading-tight text-text-secondary">
      {authors.map((author) => author.name).join(', ')}
    </div>
  )
}

function DateTag({ label, accepted }: { label: string; accepted?: boolean }) {
  return (
    <span
      className={cn(
        'min-w-[44px] rounded-[5px] px-1.5 py-0.5 text-center text-[9px] font-extrabold uppercase tracking-[0.04em] text-white',
        accepted ? 'bg-[#10B981]' : 'bg-gray-300 dark:bg-white/25',
      )}
    >
      {label}
    </span>
  )
}

export function ArticleListRow({
  article,
  locale,
  expansion,
  admin,
}: {
  article: DashboardArticleItem
  locale: string
  expansion: ArticleRowExpansion | null
  admin?: { studyOptions: StudyOption[] }
}) {
  const t = useTranslations('publications')
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const formatDate = (iso: string | null) => (iso ? dateFormatter.format(new Date(iso)) : '—')
  const expanded = expansion?.open ?? false

  return (
    <div className={cn('border-b border-line last:border-b-0', expanded && 'bg-coral-50/40 dark:bg-coral-500/[0.05]')}>
      <div className={cn(ARTICLES_GRID, 'px-5 py-3.5 transition-colors hover:bg-coral-50/40 dark:hover:bg-coral-500/[0.06]')}>
        <div className="flex min-w-0 items-start gap-2.5">
          {expansion && (
            <button
              type="button"
              aria-label={`${t('myPub.toggleHistory')}: ${article.title || t('myPub.untitled')}`}
              onClick={expansion.onToggle}
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition',
                expanded
                  ? 'border-coral-200 bg-coral-50 text-coral-600 dark:border-coral-500/40 dark:bg-coral-500/15'
                  : 'border-line bg-bg-surface text-text-muted',
              )}
            >
              <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} strokeWidth={2.4} />
            </button>
          )}
          <div className="min-w-0">
            <span
              className={cn(
                'mb-1 inline-flex rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide',
                ARTICLE_TYPE_BADGE[article.type],
              )}
            >
              {t(`myPub.type.${article.type}`)}
            </span>
            <Link
              href={`/publications/articles/${article.id}`}
              className="block text-sm font-bold leading-snug text-text-primary underline-offset-2 transition-colors hover:text-coral-600 hover:underline dark:hover:text-coral-300"
            >
              {article.title || t('myPub.untitled')}
            </Link>
            <AuthorLine authors={article.authors} />
          </div>
        </div>

        <span
          title={article.journalFull ?? undefined}
          className="break-words text-[13px] font-semibold leading-snug text-text-primary"
        >
          {article.journal ?? '—'}
        </span>

        <div className="min-w-0">
          {admin ? (
            <ArticleStudySelect
              articleId={article.id}
              articleTitle={article.title || t('myPub.untitled')}
              studyId={article.studyId}
              studyOptions={admin.studyOptions}
            />
          ) : article.studyLabel ? (
            <span className="inline-flex max-w-full items-center truncate rounded-md border border-[#DDD6FE] bg-[#F5F3FF] px-2.5 py-0.5 text-[11.5px] font-bold text-[#6D28D9] dark:border-[rgba(139,92,246,0.32)] dark:bg-[rgba(139,92,246,0.16)] dark:text-[#C4B5FD]">
              {article.studyLabel}
            </span>
          ) : (
            <span className="text-[13px] text-text-muted">—</span>
          )}
        </div>

        <div className="min-w-0">
          <ArticleScopeSwitch
            articleId={article.id}
            articleTitle={article.title || t('myPub.untitled')}
            scope={article.scope}
            editable={Boolean(admin)}
          />
        </div>

        <div>
          <span className={pillClassName(ARTICLE_STATUS_TONE[article.status])}>{t(`articles.status.${article.status}`)}</span>
        </div>

        <div className="flex flex-col gap-1">
          {article.lastSubmissionAt ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-text-primary tabular-nums">
              <DateTag label={t('myPub.submissionTag')} />
              {formatDate(article.lastSubmissionAt)}
            </span>
          ) : (
            <span className="text-[13px] text-text-muted">—</span>
          )}
          {article.acceptedAt ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#047857] tabular-nums dark:text-[#6EE7B7]">
              <DateTag label={t('myPub.acceptedTag')} accepted />
              {formatDate(article.acceptedAt)}
            </span>
          ) : article.pendingDays != null ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B45309] tabular-nums dark:text-[#FBBF24]">
              <Clock className="h-3 w-3" strokeWidth={2.2} />
              {t('myPub.pending', { days: article.pendingDays })}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-1.5">
          {article.pdfUrl && (
            <a
              href={article.pdfUrl}
              download
              target="_blank"
              rel="noreferrer"
              title={t('articles.downloadPdf')}
              aria-label={`${t('articles.downloadPdf')}: ${article.title || t('myPub.untitled')}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-navy-600 transition hover:bg-gray-50 dark:text-navy-300 dark:hover:bg-white/5"
            >
              <FileText className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
          )}
          {article.doi && (
            <a
              href={`https://doi.org/${article.doi}`}
              target="_blank"
              rel="noreferrer"
              title={t('myPub.openSite')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-coral-600 transition hover:bg-coral-50 dark:text-coral-300 dark:hover:bg-white/5"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
          )}
          <Link
            href={`/publications/articles/${article.id}/edit`}
            title={t('myPub.edit')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-navy-600 to-navy-700 text-white shadow-[0_6px_14px_-6px_rgba(19,44,74,0.5)] transition hover:brightness-110"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
          {admin && (
            <ArticleDeleteButton articleId={article.id} articleTitle={article.title || t('myPub.untitled')} />
          )}
        </div>
      </div>

      {expansion && expanded && (
        <div className="px-5 pb-4">
          <SubmissionHistory
            articleId={article.id}
            submissions={article.submissions}
            locale={locale}
            journalNames={expansion.journalNames}
          />
        </div>
      )}
    </div>
  )
}

export type ArticlesSorting = { value: ArticleSort; onSort: (key: ArticleSortKey) => void }

const HEADER_LABEL_CLASS = 'text-[11px] font-bold uppercase tracking-[0.06em] text-text-muted'

export function ArticlesHeaderRow({ sorting }: { sorting?: ArticlesSorting }) {
  const t = useTranslations('publications.myPub.col')
  const tArticles = useTranslations('publications.articles')
  return (
    <div className={cn(ARTICLES_GRID, 'sticky top-0 z-10 border-y border-line bg-gray-50/90 px-5 py-3 backdrop-blur dark:bg-white/[0.03]')}>
      {ARTICLE_SORT_KEYS.map((key) => {
        const label = t(key)
        if (!sorting) {
          return (
            <span key={key} className="contents">
              <span className={HEADER_LABEL_CLASS}>{label}</span>
              {key === 'study' && <span className={HEADER_LABEL_CLASS}>{tArticles('scopeLabel')}</span>}
            </span>
          )
        }
        const active = sorting.value?.key === key
        const ascending = active && sorting.value?.direction === 'asc'
        return (
          <span key={key} className="contents">
            <button
              type="button"
              onClick={() => sorting.onSort(key)}
              aria-sort={active ? (ascending ? 'ascending' : 'descending') : 'none'}
              className={cn(
                HEADER_LABEL_CLASS,
                'inline-flex items-center gap-1 text-left transition-colors hover:text-coral-600 dark:hover:text-coral-300',
                active && 'text-coral-600 dark:text-coral-300',
              )}
            >
              {label}
              {active ? (
                <ArrowUp className={cn('h-3 w-3 transition-transform', !ascending && 'rotate-180')} strokeWidth={2.6} />
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-40" strokeWidth={2.2} />
              )}
            </button>
            {key === 'study' && <span className={HEADER_LABEL_CLASS}>{tArticles('scopeLabel')}</span>}
          </span>
        )
      })}
      <span className={cn(HEADER_LABEL_CLASS, 'text-right')}>{t('action')}</span>
    </div>
  )
}
