'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Check, ExternalLink, FilePlus2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SingleSelect } from '@/components/ui/single-select'
import type { ArticleScopeValue } from '@/lib/publications/article-scope'
import { SUBMISSION_STATUS_TONE, TONE_PILL_CLASS } from '@/lib/publications/status-display'
import type { MailArticleOption, MailSuggestionRow } from '@/lib/services/publications/mail-suggestions'

export function mailEventKey(suggestion: Pick<MailSuggestionRow, 'kind' | 'decision'>) {
  return suggestion.kind === 'DECISION' && suggestion.decision ? suggestion.decision : 'SUBMISSION'
}

export function mailEventPillClass(suggestion: Pick<MailSuggestionRow, 'kind' | 'decision'>): string {
  const tone = SUBMISSION_STATUS_TONE[suggestion.kind === 'DECISION' && suggestion.decision ? suggestion.decision : 'SUBMITTED']
  return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${TONE_PILL_CLASS[tone]}`
}

export type SuggestionReview = {
  busy: boolean
  apply: (input: { suggestionId: string; articleId: string; journalName: string }) => void
  create: (input: { suggestionId: string; journalName: string; scope: ArticleScopeValue }) => void
  dismiss: (input: { suggestionId: string }) => void
}

type SuggestionCardProps = {
  suggestion: MailSuggestionRow
  articleOptions: MailArticleOption[]
  review: SuggestionReview
}

export function SuggestionCard({ suggestion, articleOptions, review }: SuggestionCardProps) {
  const t = useTranslations('publications')
  const locale = useLocale()
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const [articleId, setArticleId] = useState(suggestion.article?.id ?? '')
  const [journalName, setJournalName] = useState(suggestion.resolvedJournalName ?? suggestion.journalName)

  const busy = review.busy
  const hasJournal = journalName.trim().length > 0
  const options = articleOptions.map((option) => ({ value: option.id, label: option.title }))
  const journalFieldId = `mail-suggestion-journal-${suggestion.id}`

  return (
    <li
      aria-label={suggestion.title}
      className="space-y-4 rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs"
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={mailEventPillClass(suggestion)}>{t(`mailAgent.event.${mailEventKey(suggestion)}`)}</span>
          <span className="inline-flex items-center rounded-full border border-line bg-bg-muted px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
            {t(`mailAgent.reason.${suggestion.reviewReason ?? 'UNSPECIFIED'}`)}
          </span>
        </div>
        <h3 className="text-base font-bold text-text-primary">{suggestion.title}</h3>
        <p className="text-sm text-text-secondary">
          {suggestion.journalName} · {dateFormatter.format(new Date(suggestion.eventDate))}
          {suggestion.manuscriptNumber && ` · ${t('mailAgent.manuscript', { number: suggestion.manuscriptNumber })}`}
        </p>
        <blockquote className="border-l-2 border-coral-500 pl-3 text-sm italic text-text-secondary">
          {suggestion.excerpt}
        </blockquote>
        {suggestion.article && (
          <p className="text-sm text-text-secondary">
            {t('mailAgent.currentStatus', { status: t(`articles.status.${suggestion.article.status}`) })}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
          <span>{t('mailAgent.sources', { count: suggestion.sources.length })}</span>
          {suggestion.sources.map((source) => (
            <span key={source.id} className="inline-flex items-center gap-1.5">
              {source.sender} · {dateFormatter.format(new Date(source.receivedAt))}
              {source.threadUrl && (
                <a
                  href={source.threadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-coral-600 underline-offset-4 hover:underline"
                >
                  <ExternalLink className="size-3" />
                  {t('mailAgent.openMail')}
                </a>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <span className="block text-sm font-medium leading-none">{t('mailAgent.articleLabel')}</span>
          <SingleSelect
            options={options}
            value={articleId}
            onChange={setArticleId}
            placeholder={t('mailAgent.articlePlaceholder')}
            searchable
            searchPlaceholder={t('mailAgent.articleSearch')}
            emptyLabel={t('mailAgent.articleEmpty')}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={journalFieldId}>{t('mailAgent.journalLabel')}</Label>
          <Input
            id={journalFieldId}
            value={journalName}
            onChange={(event) => setJournalName(event.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => review.dismiss({ suggestionId: suggestion.id })}
        >
          <X className="size-4" />
          {t('mailAgent.dismiss')}
        </Button>
        {articleId === '' && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !hasJournal}
              onClick={() => review.create({ suggestionId: suggestion.id, journalName, scope: 'OUTSIDE_TEAM' })}
            >
              {t('mailAgent.createOutside')}
            </Button>
            <Button
              type="button"
              disabled={busy || !hasJournal}
              onClick={() => review.create({ suggestionId: suggestion.id, journalName, scope: 'LARIB_TEAM' })}
            >
              <FilePlus2 className="size-4" />
              {t('mailAgent.createTeam')}
            </Button>
          </>
        )}
        {articleId !== '' && (
          <Button
            type="button"
            disabled={busy || !hasJournal}
            onClick={() => review.apply({ suggestionId: suggestion.id, articleId, journalName })}
          >
            <Check className="size-4" />
            {t('mailAgent.apply')}
          </Button>
        )}
      </div>
    </li>
  )
}
