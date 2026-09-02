'use client'

import { useTranslations, useLocale } from 'next-intl'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { publicationsPaths, PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import type { EmailLogEntry } from '@/lib/services/publications/email-log'

const ADMIN_PATHS = publicationsPaths(PUBLICATIONS_ADMIN_BASE)

export function EmailLogTable({ entries }: { entries: EmailLogEntry[] }) {
  const t = useTranslations('publications.emails')
  const locale = useLocale()
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })

  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-text-muted">
        {t('empty')}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-bg-surface">
      <table className="w-full text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>{t('colKind')}</TableHead>
            <TableHead>{t('colSubject')}</TableHead>
            <TableHead>{t('colTo')}</TableHead>
            <TableHead>{t('colSentBy')}</TableHead>
            <TableHead>{t('colSentAt')}</TableHead>
            <TableHead>{t('colStatus')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap font-semibold text-text-primary">
                {t(`kind${entry.kind}`)}
              </TableCell>
              <TableCell className="min-w-[240px]">
                <span className="block text-text-primary">{entry.subject}</span>
                {entry.article && (
                  <Link
                    href={ADMIN_PATHS.article(entry.article.id)}
                    className="block truncate text-xs text-text-secondary underline-offset-4 hover:underline"
                  >
                    {entry.article.title}
                  </Link>
                )}
              </TableCell>
              <TableCell className="min-w-[200px] text-text-secondary">
                <span className="block break-words">{entry.toEmails.join(', ')}</span>
                {entry.ccEmails.length > 0 && (
                  <span className="block break-words text-xs text-text-muted">
                    {t('ccLabel')} : {entry.ccEmails.join(', ')}
                  </span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                {entry.sentByName ?? t('systemSender')}
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums text-text-secondary">
                {formatter.format(new Date(entry.sentAt))}
              </TableCell>
              <TableCell>
                {entry.status === 'SENT' ? (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-[#047857] dark:text-[#6EE7B7]">
                    <CheckCircle2 className="size-4" strokeWidth={2.2} />
                    {t('statusSENT')}
                  </span>
                ) : (
                  <span
                    title={entry.error ?? undefined}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-[#B91C1C] dark:text-[#FCA5A5]"
                  >
                    <XCircle className="size-4" strokeWidth={2.2} />
                    {t('statusFAILED')}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  )
}
