import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { listCommunicationArticles } from '@/lib/services/publications/communication'
import { CommunicationView } from '@/app/[locale]/publications/components/communication/communication-view'
import { BackToDashboard } from '@/app/[locale]/publications/components/back-to-dashboard'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function PublicationsCommunicationPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
  const articles = await listCommunicationArticles()

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <BackToDashboard locale={locale} />
        <Suspense fallback={null}>
          <CommunicationView articles={articles} locale={locale} />
        </Suspense>
      </div>
    </div>
  )
}
