'use client'

import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import type { DashboardArticleItem } from '@/lib/publications/admin-dashboard'
import {
  previewMailApplication,
  type MailEvent,
  type MailTarget,
  type PreviewSubmissionRow,
} from '@/lib/publications/mail-agent-preview'
import {
  ARTICLE_STATUS_TONE,
  SUBMISSION_STATUS_TONE,
  TONE_PILL_CLASS,
} from '@/lib/publications/status-display'

type ApplicationPreviewProps = {
  event: MailEvent & { journalName: string }
  article: DashboardArticleItem
  target: MailTarget
  onTargetChange: (target: MailTarget) => void
}

const PILL = 'inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm font-bold'

const CHANGE_CLASS: Record<PreviewSubmissionRow['change'], string> = {
  NONE: '',
  UPDATED: 'border-[#7C3AED] bg-[#F5F3FF] dark:bg-[rgba(124,58,237,0.12)]',
  CREATED: 'border-[#047857] bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.12)]',
  REJECTED: 'border-[#DC2626] bg-[#FEF2F2] dark:bg-[rgba(239,68,68,0.12)]',
}

export function ApplicationPreview({ event, article, target, onTargetChange }: ApplicationPreviewProps) {
  const t = useTranslations('publications')
  const locale = useLocale()
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'long' })
  const formatDate = (iso: string) => dateFormatter.format(new Date(iso))
  const preview = previewMailApplication(event, article, target)
  const journalFieldId = `mail-target-journal-${article.id}-${event.eventDate}`
  const newJournalName = target.kind === 'NEW' ? target.journalName : ''

  const articleStatusPill = (status: DashboardArticleItem['status']) => (
    <span className={cn(PILL, TONE_PILL_CLASS[ARTICLE_STATUS_TONE[status]])}>{t(`articles.status.${status}`)}</span>
  )

  const submissionRow = (row: PreviewSubmissionRow, showChange: boolean) => (
    <li
      key={row.id}
      className={cn('space-y-1 rounded-xl border border-line px-3 py-2', showChange && CHANGE_CLASS[row.change])}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold text-text-primary">{row.journalName}</span>
        <span className={cn(PILL, TONE_PILL_CLASS[SUBMISSION_STATUS_TONE[row.status]])}>
          {t(`myPub.subStatus.${row.status}`)}
        </span>
        {showChange && row.change !== 'NONE' && (
          <span className="text-base font-bold text-text-primary">{t(`mailAgent.preview.change.${row.change}`)}</span>
        )}
      </div>
      <p className="text-base text-text-primary">
        {t('mailAgent.preview.submittedOn', { date: formatDate(row.submittedAt) })}
        {row.decidedAt && ` · ${t('mailAgent.preview.decidedOn', { date: formatDate(row.decidedAt) })}`}
      </p>
    </li>
  )

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-base font-semibold text-text-primary">{t('mailAgent.preview.concerns')}</legend>
        {article.submissions.map((submission) => (
          <label key={submission.id} className="flex cursor-pointer items-center gap-3 text-base text-text-primary">
            <input
              type="radio"
              name={`mail-target-${journalFieldId}`}
              checked={target.kind === 'EXISTING' && target.submissionId === submission.id}
              onChange={() => onTargetChange({ kind: 'EXISTING', submissionId: submission.id })}
              className="size-4 accent-coral-600"
            />
            {t('mailAgent.preview.existingOption', {
              journal: submission.journalName,
              date: formatDate(submission.submittedAt),
              status: t(`myPub.subStatus.${submission.status}`),
            })}
          </label>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-3 text-base text-text-primary">
            <input
              type="radio"
              name={`mail-target-${journalFieldId}`}
              checked={target.kind === 'NEW'}
              onChange={() => onTargetChange({ kind: 'NEW', journalName: event.journalName })}
              className="size-4 accent-coral-600"
            />
            {t('mailAgent.preview.newOption')}
          </label>
          {target.kind === 'NEW' && (
            <Input
              id={journalFieldId}
              aria-label={t('mailAgent.journalLabel')}
              value={newJournalName}
              onChange={(changeEvent) => onTargetChange({ kind: 'NEW', journalName: changeEvent.target.value })}
              className="h-9 max-w-sm text-base"
            />
          )}
        </div>
      </fieldset>

      <div className="grid items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
        <section aria-label={t('mailAgent.preview.today')} className="space-y-3 rounded-2xl border border-line p-4">
          <h4 className="text-base font-bold text-text-primary">{t('mailAgent.preview.today')}</h4>
          <p className="flex flex-wrap items-center gap-2 text-base text-text-primary">
            {t('mailAgent.preview.articleStatus')} {articleStatusPill(preview.articleStatusBefore)}
          </p>
          {article.submissions.length === 0 ? (
            <p className="text-base text-text-primary">{t('mailAgent.preview.noSubmission')}</p>
          ) : (
            <ul className="space-y-2">
              {[...article.submissions]
                .sort((first, second) => first.submittedAt.localeCompare(second.submittedAt))
                .map((submission) => submissionRow({ ...submission, change: 'NONE' }, false))}
            </ul>
          )}
        </section>
        <ArrowRight aria-hidden className="mx-auto hidden size-6 self-center text-text-primary md:block" />
        <section aria-label={t('mailAgent.preview.after')} className="space-y-3 rounded-2xl border-2 border-coral-500/50 p-4">
          <h4 className="text-base font-bold text-text-primary">{t('mailAgent.preview.after')}</h4>
          <p className="flex flex-wrap items-center gap-2 text-base text-text-primary">
            {t('mailAgent.preview.articleStatus')} {articleStatusPill(preview.articleStatusAfter)}
          </p>
          <ul className="space-y-2">{preview.submissions.map((row) => submissionRow(row, true))}</ul>
        </section>
      </div>
    </div>
  )
}
