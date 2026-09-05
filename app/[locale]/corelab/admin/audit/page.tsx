import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { auditActors, listAuditEvents } from '@/lib/services/corelab/audit'
import { listStudies } from '@/lib/services/corelab/studies'
import { AuditFilters } from './audit-filters'

type PageParams = {
  params: Promise<{ locale: 'en' | 'fr' }>
  searchParams: Promise<Record<string, string | undefined>>
}

// Opaque cuids carry no meaning for a reader; the object column already names the row.
function readableChanges(
  action: string,
  changes: Array<{ field: string; oldLabel: string | null; newLabel: string | null; oldValue: string | null; newValue: string | null }>,
): string[] {
  return changes
    .filter((change) => !/Id$/.test(change.field) && change.field !== 'fileKey')
    .map((change) => {
      const before = change.oldLabel ?? change.oldValue
      const after = change.newLabel ?? change.newValue ?? '—'
      if (action === 'CREATE' || before === null) return `${change.field}: ${after}`
      return `${change.field}: ${before} → ${after}`
    })
}

const ACTION_STYLE: Record<string, string> = {
  CREATE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  UPDATE: 'border-amber-200 bg-amber-50 text-amber-800',
  DELETE: 'border-red-200 bg-red-50 text-red-700',
}

export default async function CorelabAuditPage({ params, searchParams }: PageParams) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/corelab'))

  const t = await getTranslations({ locale, namespace: 'corelab.audit' })
  const page = Number(query.page ?? '1')

  const [{ events, total, pageSize }, actors, studies] = await Promise.all([
    listAuditEvents({
      page,
      actorId: query.actorId || undefined,
      studyId: query.studyId || undefined,
      query: query.query || undefined,
      from: query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined,
      to: query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined,
    }),
    auditActors(),
    listStudies(),
  ])
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const pageLink = (target: number) => {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => Boolean(value)) as [string, string][])
    params.set('page', String(target))
    return `/corelab/admin/audit?${params.toString()}`
  }

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <AuditFilters
        actors={actors}
        studies={studies.map((study) => ({ id: study.id, code: study.code }))}
        initial={{
          actorId: query.actorId ?? '', studyId: query.studyId ?? '', query: query.query ?? '',
          from: query.from ?? '', to: query.to ?? '',
        }}
      />

      <section className="rounded-2xl border border-border bg-white p-6">
        <p className="text-sm text-text-secondary">{t('results', { count: total })}</p>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">{t('empty')}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('timestamp')}</TableHead>
                  <TableHead>{t('actor')}</TableHead>
                  <TableHead>{t('action')}</TableHead>
                  <TableHead>{t('object')}</TableHead>
                  <TableHead>{t('detail')}</TableHead>
                  <TableHead>{t('ip')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap text-text-secondary">
                      {new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(event.createdAt)}
                    </TableCell>
                    <TableCell className="text-text-primary">{event.actorLabel ?? '—'}</TableCell>
                    <TableCell>
                      <span className={`rounded-md border px-1.5 py-0.5 text-[11px] ${ACTION_STYLE[event.action] ?? ''}`}>
                        {t(`actions.${event.action}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-text-primary">{event.entityLabel ?? '—'}</span>
                      <span className="block text-xs text-text-secondary">
                        {event.entity === 'CORELAB_SIGNATURE' ? t('signature') : event.entity}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md text-xs text-text-secondary">
                      {readableChanges(event.action, event.changes).join(' · ') || '—'}
                    </TableCell>
                    <TableCell className="text-text-secondary">{event.ipAddress || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-text-secondary">{t('page', { page, pages })}</span>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link href={pageLink(Math.max(1, page - 1))}>{t('previous')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={page >= pages}>
              <Link href={pageLink(Math.min(pages, page + 1))}>{t('next')}</Link>
            </Button>
          </div>
        </div>

        <p className="mt-4 text-xs text-text-secondary">{t('writeOnly')}</p>
      </section>
    </>
  )
}
