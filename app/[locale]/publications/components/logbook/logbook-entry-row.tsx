'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import { cn } from '@/lib/utils'
import { PILL_BASE, TONE_PILL_CLASS, type StatusTone } from '@/lib/publications/status-display'
import { changeDisplayValues, logbookFieldKey } from '@/lib/publications/logbook-labels'
import type { LogbookChange, LogbookEntry } from '@/lib/services/publications/logbook'

const ACTION_TONE: Record<string, StatusTone> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
}

const VISIBLE_CHANGES = 2

function formatMoment(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(value)
}

function ChangeLine({ change }: { change: LogbookChange }) {
  const t = useTranslations('publications.logbook')
  const { from, to } = changeDisplayValues(change)

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
      <span className="font-bold text-text-primary">{t(logbookFieldKey(change.field))}</span>
      <span className={cn('text-text-secondary', from === null && 'italic')}>{from ?? t('emptyValue')}</span>
      <ArrowRight aria-hidden className="size-3.5 shrink-0 text-text-secondary" />
      <span className={cn('font-semibold text-text-primary', to === null && 'font-normal italic text-text-secondary')}>
        {to ?? t('emptyValue')}
      </span>
    </div>
  )
}

export function LogbookEntryRow({ entry, locale, basePath }: { entry: LogbookEntry; locale: string; basePath: string }) {
  const t = useTranslations('publications.logbook')
  const [expanded, setExpanded] = useState(false)

  const hiddenCount = entry.changes.length - VISIBLE_CHANGES
  const shownChanges = expanded ? entry.changes : entry.changes.slice(0, VISIBLE_CHANGES)
  const actor = entry.actorLabel ?? t(`sources.${entry.source}`)

  return (
    <div className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0 md:flex-row md:items-start md:gap-4">
      <div className="shrink-0 text-[12px] tabular-nums text-text-secondary md:w-40">
        {formatMoment(entry.createdAt, locale)}
      </div>

      <div className="shrink-0 md:w-44">
        <span className="block truncate text-[13px] font-bold text-text-primary">{actor}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:w-56">
        <span className={cn(PILL_BASE, TONE_PILL_CLASS[ACTION_TONE[entry.action] ?? 'muted'])}>
          {t(`actions.${entry.action}`)}
        </span>
        <span className="truncate text-[12px] font-semibold text-text-secondary">
          {t(`entities.${entry.entity}`)}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        {entry.articleId ? (
          <Link
            href={`${basePath}/articles/${entry.articleId}`}
            className="block truncate text-[13px] font-extrabold text-text-primary hover:text-coral-600"
          >
            {entry.entityLabel}
          </Link>
        ) : (
          <span className="block truncate text-[13px] font-extrabold text-text-primary">{entry.entityLabel}</span>
        )}

        {shownChanges.map((change) => (
          <ChangeLine key={`${entry.id}-${change.field}`} change={change} />
        ))}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-[12px] font-bold text-coral-600 hover:underline"
          >
            <ChevronDown aria-hidden className={cn('size-3.5 transition', expanded && 'rotate-180')} />
            {expanded ? t('hideDetail') : t('showDetail')}
          </button>
        )}
      </div>
    </div>
  )
}
