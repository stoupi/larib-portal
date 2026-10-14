'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/app/i18n/navigation'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import type { MailSuggestionRow } from '@/lib/services/publications/mail-suggestions'
import { mailEventKey, mailEventPillClass } from './suggestion-card'

const ADMIN_PATHS = publicationsPaths(PUBLICATIONS_ADMIN_BASE)

export function SuggestionHistory({ suggestions }: { suggestions: MailSuggestionRow[] }) {
  const t = useTranslations('publications.mailAgent')
  const locale = useLocale()
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  if (suggestions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-base text-text-primary">
        {t('historyEmpty')}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-bg-surface">
      <table className="w-full text-base">
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.event')}</TableHead>
            <TableHead>{t('columns.article')}</TableHead>
            <TableHead>{t('columns.journal')}</TableHead>
            <TableHead>{t('columns.date')}</TableHead>
            <TableHead>{t('columns.outcome')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suggestions.map((suggestion) => (
            <TableRow key={suggestion.id}>
              <TableCell className="whitespace-nowrap">
                <span className={mailEventPillClass(suggestion)}>{t(`event.${mailEventKey(suggestion)}`)}</span>
              </TableCell>
              <TableCell className="min-w-[280px]">
                {suggestion.article ? (
                  <Link
                    href={ADMIN_PATHS.article(suggestion.article.id)}
                    className="font-semibold text-text-primary underline-offset-4 hover:underline"
                  >
                    {suggestion.article.title || suggestion.title}
                  </Link>
                ) : (
                  <span className="text-text-primary">{suggestion.title}</span>
                )}
              </TableCell>
              <TableCell className="text-text-primary">
                {suggestion.resolvedJournalName ?? suggestion.journalName}
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums text-text-primary">
                {dateFormatter.format(new Date(suggestion.eventDate))}
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-primary">
                {suggestion.status !== 'PENDING' && t(`status.${suggestion.status}`)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  )
}
