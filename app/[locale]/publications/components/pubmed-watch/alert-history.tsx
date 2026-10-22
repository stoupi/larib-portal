'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/app/i18n/navigation'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import type { PubmedAlertRow } from '@/lib/services/publications/pubmed-watch'
import { pubmedUrl } from './alert-card'

const ADMIN_PATHS = publicationsPaths(PUBLICATIONS_ADMIN_BASE)

export function AlertHistory({ alerts }: { alerts: PubmedAlertRow[] }) {
  const t = useTranslations('publications.pubmedWatch')
  const locale = useLocale()
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  if (alerts.length === 0) {
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
            <TableHead>{t('columns.article')}</TableHead>
            <TableHead>{t('columns.journal')}</TableHead>
            <TableHead>{t('columns.pubmed')}</TableHead>
            <TableHead>{t('columns.date')}</TableHead>
            <TableHead>{t('columns.outcome')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={alert.id}>
              <TableCell className="min-w-[280px]">
                {alert.article ? (
                  <Link
                    href={ADMIN_PATHS.article(alert.article.id)}
                    className="font-semibold text-text-primary underline-offset-4 hover:underline"
                  >
                    {alert.article.title || alert.title}
                  </Link>
                ) : (
                  <span className="text-text-primary">{alert.title}</span>
                )}
              </TableCell>
              <TableCell className="text-text-primary">{alert.journalName}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">
                <a href={pubmedUrl(alert.pmid)} target="_blank" rel="noreferrer" className="text-text-primary underline underline-offset-4">
                  {alert.pmid}
                </a>
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums text-text-primary">
                {alert.resolvedAt && dateFormatter.format(new Date(alert.resolvedAt))}
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-primary">{t(`status.${alert.status}`)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  )
}
