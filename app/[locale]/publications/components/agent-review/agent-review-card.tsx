'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Check, ExternalLink, History } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import { PILL_BASE, TONE_PILL_CLASS } from '@/lib/publications/status-display'
import type { AgentReviewGroup } from '@/lib/publications/agent-review'
import { ACTION_TONE, ChangeLine } from '../logbook/logbook-entry-row'

const ADMIN_PATHS = publicationsPaths(PUBLICATIONS_ADMIN_BASE)

type AgentReviewCardProps = {
  group: AgentReviewGroup
  busy: boolean
  onVerify: (group: AgentReviewGroup) => void
}

export function AgentReviewCard({ group, busy, onVerify }: AgentReviewCardProps) {
  const t = useTranslations('publications')
  const locale = useLocale()
  const momentFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <li aria-label={group.title} className="space-y-4 rounded-2xl border border-line bg-bg-surface p-6 shadow-elevation-xs">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(PILL_BASE, TONE_PILL_CLASS[group.isNewArticle ? 'success' : 'info'])}>
            {t(group.isNewArticle ? 'agentReview.newArticle' : 'agentReview.updatedArticle')}
          </span>
          {group.sources.map((source) => (
            <span key={source} className={cn(PILL_BASE, TONE_PILL_CLASS.muted)}>
              {t(`agentReview.sources.${source}`)}
            </span>
          ))}
          {!group.articleExists && (
            <span className={cn(PILL_BASE, TONE_PILL_CLASS.danger)}>{t('agentReview.deletedArticle')}</span>
          )}
        </div>
        <h3 className="text-lg font-bold text-text-primary">{group.title}</h3>
      </div>

      <ol className="space-y-3 border-l-2 border-line pl-4">
        {group.entries.map((entry) => (
          <li key={entry.id} className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="tabular-nums text-text-primary">{momentFormatter.format(entry.createdAt)}</span>
              <span className={cn(PILL_BASE, TONE_PILL_CLASS[ACTION_TONE[entry.action] ?? 'muted'])}>
                {t(`logbook.actions.${entry.action}`)}
              </span>
              <span className="font-semibold text-text-primary">{t(`logbook.entities.${entry.entity}`)}</span>
            </div>
            {entry.changes.map((change) => (
              <ChangeLine key={`${entry.id}-${change.field}`} change={change} />
            ))}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        {group.articleExists && (
          <Button asChild variant="outline">
            <Link href={ADMIN_PATHS.article(group.articleId)}>
              <ExternalLink className="size-4" />
              {t('agentReview.openArticle')}
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href={`/publications/admin/logbook?articleId=${group.articleId}`}>
            <History className="size-4" />
            {t('agentReview.openLogbook')}
          </Link>
        </Button>
        <span className="flex-1" />
        <Button type="button" disabled={busy} onClick={() => onVerify(group)}>
          <Check className="size-4" />
          {t('agentReview.verify')}
        </Button>
      </div>
    </li>
  )
}
