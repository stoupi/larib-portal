import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'
import {
  logbookFiltersToQuery,
  parseLogbookFilters,
  type LogbookSearchParams,
} from '@/lib/publications/logbook-filters'
import { listLogbookActors, listLogbookEntries } from '@/lib/services/publications/logbook'
import { BackToDashboard } from '@/app/[locale]/publications/components/back-to-dashboard'
import { LogbookFiltersBar } from '@/app/[locale]/publications/components/logbook/logbook-filters-bar'
import { LogbookTable } from '@/app/[locale]/publications/components/logbook/logbook-table'

type PageParams = {
  params: Promise<{ locale: 'en' | 'fr' }>
  searchParams: Promise<LogbookSearchParams>
}

export default async function PublicationsLogbookPage({ params, searchParams }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))

  const query = await searchParams
  const filters = parseLogbookFilters(query)
  const cursor = typeof query.cursor === 'string' ? query.cursor : null

  const [t, { entries, nextCursor }, actors] = await Promise.all([
    getTranslations({ locale, namespace: 'publications.logbook' }),
    listLogbookEntries(filters, cursor),
    listLogbookActors(),
  ])

  const nextPageQuery = logbookFiltersToQuery(filters)
  if (nextCursor) nextPageQuery.set('cursor', nextCursor)

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <BackToDashboard locale={locale} />

        <header className="space-y-1">
          <h1 className="text-2xl font-extrabold text-text-primary">{t('title')}</h1>
          <p className="text-sm text-text-secondary">{t('description')}</p>
        </header>

        <LogbookFiltersBar filters={filters} actors={actors} />

        <LogbookTable entries={entries} locale={locale} basePath={PUBLICATIONS_ADMIN_BASE} />

        {nextCursor && (
          <div className="flex justify-center">
            <Link
              href={`/publications/admin/logbook?${nextPageQuery.toString()}`}
              className="inline-flex h-9 items-center rounded-full border border-line bg-bg-surface px-4 text-[13px] font-bold text-text-secondary transition hover:bg-gray-50 hover:text-coral-600 dark:hover:bg-white/5"
            >
              {t('loadMore')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
