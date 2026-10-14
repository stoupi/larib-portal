'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Check, FilePlus2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ArticleScopeValue } from '@/lib/publications/article-scope'
import { SUBMISSION_STATUS_TONE, TONE_PILL_CLASS } from '@/lib/publications/status-display'
import type { DashboardArticleItem } from '@/lib/publications/admin-dashboard'
import type { MailSuggestionRow } from '@/lib/services/publications/mail-suggestions'
import { defaultMailTarget, type MailTarget } from '@/lib/publications/mail-agent-preview'
import { ApplicationPreview } from './application-preview'
import { ArticlePickerDialog } from './article-picker-dialog'
import { MailDialog } from './mail-dialog'

export function mailEventKey(suggestion: Pick<MailSuggestionRow, 'kind' | 'decision'>) {
  return suggestion.kind === 'DECISION' && suggestion.decision ? suggestion.decision : 'SUBMISSION'
}

export function mailEventPillClass(suggestion: Pick<MailSuggestionRow, 'kind' | 'decision'>): string {
  const tone = SUBMISSION_STATUS_TONE[suggestion.kind === 'DECISION' && suggestion.decision ? suggestion.decision : 'SUBMITTED']
  return `inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${TONE_PILL_CLASS[tone]}`
}

export type SuggestionReview = {
  busy: boolean
  apply: (input: { suggestionId: string; articleId: string; target: MailTarget }) => void
  create: (input: { suggestionId: string; journalName: string; scope: ArticleScopeValue }) => void
  dismiss: (input: { suggestionId: string }) => void
}

type SuggestionCardProps = {
  suggestion: MailSuggestionRow
  articles: DashboardArticleItem[]
  review: SuggestionReview
}

export function SuggestionCard({ suggestion, articles, review }: SuggestionCardProps) {
  const t = useTranslations('publications')
  const locale = useLocale()
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'long' })
  const [articleId, setArticleId] = useState(suggestion.article?.id ?? '')
  const [journalName, setJournalName] = useState(suggestion.resolvedJournalName ?? suggestion.journalName)

  const [chosenTarget, setChosenTarget] = useState<MailTarget | null>(null)

  const busy = review.busy
  const hasJournal = journalName.trim().length > 0
  const asksForArticle = suggestion.article == null
  const selectedArticle = articles.find((article) => article.id === articleId) ?? null
  const asksForJournal = selectedArticle == null && suggestion.reviewReason === 'UNKNOWN_JOURNAL'
  const event = { kind: suggestion.kind, decision: suggestion.decision, eventDate: suggestion.eventDate }
  const target = selectedArticle
    ? chosenTarget ??
      defaultMailTarget(
        { ...event, journalName: suggestion.journalName },
        selectedArticle.submissions,
        selectedArticle.id === suggestion.article?.id ? suggestion.suggestedSubmissionId : null,
      )
    : null
  const targetIsComplete = target != null && (target.kind === 'EXISTING' || target.journalName.trim().length > 0)

  const selectArticle = (nextArticleId: string) => {
    setArticleId(nextArticleId)
    setChosenTarget(null)
  }
  const journalFieldId = `mail-suggestion-journal-${suggestion.id}`

  return (
    <li
      aria-label={suggestion.title}
      className="space-y-5 rounded-2xl border border-line bg-bg-surface p-6 shadow-elevation-xs"
    >
      <div className="space-y-3">
        <span className={mailEventPillClass(suggestion)}>{t(`mailAgent.event.${mailEventKey(suggestion)}`)}</span>
        <h3 className="text-lg font-bold text-text-primary">{suggestion.title}</h3>
        <p className="text-base text-text-primary">
          {suggestion.journalName} · {dateFormatter.format(new Date(suggestion.eventDate))}
        </p>
        <p className="text-base font-semibold text-text-primary">
          {t(`mailAgent.reason.${suggestion.reviewReason ?? 'UNSPECIFIED'}`)}
        </p>
        {suggestion.authorNames.length > 0 && (
          <p className="text-base text-text-primary">
            {t('mailAgent.mailAuthors', { names: suggestion.authorNames.join(', ') })}
          </p>
        )}
      </div>

      {asksForArticle && (
        <div className="space-y-2">
          <span className="block text-base font-medium text-text-primary">{t('mailAgent.articleLabel')}</span>
          <ArticlePickerDialog
            articles={articles}
            mailAuthors={suggestion.authorNames}
            selectedId={articleId}
            onSelect={selectArticle}
          />
        </div>
      )}

      {selectedArticle && target && (
        <ApplicationPreview event={{ ...event, journalName: suggestion.journalName }} article={selectedArticle} target={target} onTargetChange={setChosenTarget} />
      )}

      {asksForJournal && (
        <div className="max-w-xl space-y-2">
          <Label htmlFor={journalFieldId} className="text-base">
            {t('mailAgent.journalLabel')}
          </Label>
          <Input
            id={journalFieldId}
            value={journalName}
            onChange={(event) => setJournalName(event.target.value)}
            disabled={busy}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <MailDialog sources={suggestion.sources} />
        <span className="flex-1" />
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
        {selectedArticle && target && (
          <Button
            type="button"
            disabled={busy || !targetIsComplete}
            onClick={() => review.apply({ suggestionId: suggestion.id, articleId: selectedArticle.id, target })}
          >
            <Check className="size-4" />
            {t('mailAgent.apply')}
          </Button>
        )}
      </div>
    </li>
  )
}
