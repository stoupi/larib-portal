'use client'

import { useTranslations } from 'next-intl'
import { History } from 'lucide-react'
import type { LogbookEntry } from '@/lib/services/publications/logbook'
import { LogbookEntryRow } from '@/app/[locale]/publications/components/logbook/logbook-entry-row'

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
    <section
      aria-labelledby="article-history-title"
      className="overflow-hidden rounded-2xl border border-line bg-bg-surface"
    >
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <History aria-hidden className="size-4 text-coral-600" />
        <h2 id="article-history-title" className="text-sm font-extrabold text-text-primary">
          {t('articleHistory.title')}
        </h2>
      </header>

      {entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-text-secondary">{t('articleHistory.empty')}</p>
      ) : (
        <div>
          {entries.map((entry) => (
            <LogbookEntryRow key={entry.id} entry={entry} locale={locale} basePath={basePath} />
          ))}
        </div>
      )}
    </section>
  )
}
