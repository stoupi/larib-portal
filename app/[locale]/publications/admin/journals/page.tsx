import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { listJournalsWithMetrics } from '@/lib/services/publications/journals'
import { JournalsView } from '@/app/[locale]/publications/components/journals/journals-view'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function PublicationsJournalsPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
  const journals = await listJournalsWithMetrics()

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1800px]">
        <JournalsView journals={journals} />
      </div>
    </div>
  )
}
