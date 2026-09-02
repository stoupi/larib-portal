'use client'

import { useTranslations } from 'next-intl'
import type { LogbookEntry } from '@/lib/services/publications/logbook'
import { LogbookEntryRow } from '@/app/[locale]/publications/components/logbook/logbook-entry-row'
import { CollapsibleCard } from '../editor/collapsible-card'

export function ArticleHistoryCard({
  entries,
  locale,
  basePath,
}: {
  entries: LogbookEntry[]
  locale: string
  basePath: string
}) {
  const t = useTranslations('publications.logbook')

  return (
    <CollapsibleCard
      label={t('articleHistory.title')}
      title={
        <>
          <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-coral-600">
            <span className="h-2 w-2 rounded-full bg-coral-500" />
            {t('articleHistory.title')}
          </span>
          {entries.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-extrabold text-text-secondary tabular-nums dark:bg-white/10">
              {entries.length}
            </span>
          )}
        </>
      }
    >
      {entries.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('articleHistory.empty')}</p>
      ) : (
        <div className="-mx-5 border-t border-line">
          {entries.map((entry) => (
            <LogbookEntryRow key={entry.id} entry={entry} locale={locale} basePath={basePath} />
          ))}
        </div>
      )}
    </CollapsibleCard>
  )
}
