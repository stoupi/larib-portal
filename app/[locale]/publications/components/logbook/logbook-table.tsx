'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { groupLogbookEntries, type LogbookGroup } from '@/lib/publications/logbook-groups'
import type { LogbookEntry } from '@/lib/services/publications/logbook'
import { LogbookEntryRow } from './logbook-entry-row'

function GroupedOperation({ group, locale, basePath }: { group: LogbookGroup; locale: string; basePath: string }) {
  const t = useTranslations('publications.logbook')
  const [expanded, setExpanded] = useState(false)
  const [first] = group.entries

  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-white/5"
      >
        <Layers aria-hidden className="size-4 shrink-0 text-coral-600" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-extrabold text-text-primary">
            {first.summary ?? t(`sources.${first.source}`)}
          </span>
          <span className="block text-[12px] text-text-secondary">
            {t('groupedOperation', { count: group.entries.length })}
            {first.actorLabel ? ` · ${t('createdBy', { name: first.actorLabel })}` : ''}
          </span>
        </span>
        <ChevronDown aria-hidden className={cn('size-4 shrink-0 text-text-secondary transition', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="border-t border-line bg-gray-50/60 dark:bg-white/[0.02]">
          {group.entries.map((entry) => (
            <LogbookEntryRow key={entry.id} entry={entry} locale={locale} basePath={basePath} />
          ))}
        </div>
      )}
    </div>
  )
}

export function LogbookTable({
  entries,
  locale,
  basePath,
}: {
  entries: LogbookEntry[]
  locale: string
  basePath: string
}) {
  const t = useTranslations('publications.logbook')

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-bg-surface px-4 py-10 text-center text-sm text-text-secondary">
        {t('empty')}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-bg-surface">
      {groupLogbookEntries(entries).map((group) =>
        group.entries.length > 1 ? (
          <GroupedOperation key={group.operationId} group={group} locale={locale} basePath={basePath} />
        ) : (
          <LogbookEntryRow key={group.entries[0].id} entry={group.entries[0]} locale={locale} basePath={basePath} />
        ),
      )}
    </div>
  )
}
