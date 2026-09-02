import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PublicationsDashboardView } from '@/app/[locale]/publications/components/admin-dashboard/dashboard-view'
import { DashboardModules } from '@/app/[locale]/publications/components/admin-dashboard/dashboard-modules'
import { listPendingAuthorRequests } from '@/lib/services/publications/publication-requests'
import { listDashboardArticles } from '@/lib/services/publications/dashboard'
import { countAuthors } from '@/lib/services/publications/authors'
import { countCentres } from '@/lib/services/publications/centres'
import { countStudies, listStudyOptions } from '@/lib/services/publications/studies'
import { countJournals, listJournalNames } from '@/lib/services/publications/journals'
import { countPendingCarouselEmails } from '@/lib/services/publications/communication'
import { countPublicationEmails } from '@/lib/services/publications/email-log'

type PageParams = {
  params: Promise<{ locale: 'en' | 'fr' }>
}

export default async function PublicationsAdminPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()

  if (!canAdminApp(session.user, 'PUBLICATIONS')) {
    redirect(applicationLink(locale, '/publications'))
  }

  const [
    authorRequests,
    articles,
    studies,
    journalNames,
    authorCount,
    centreCount,
    studyCount,
    journalCount,
    pendingCommunications,
    emailCount,
  ] = await Promise.all([
    listPendingAuthorRequests(),
    listDashboardArticles(),
    listStudyOptions(),
    listJournalNames(),
    countAuthors(),
    countCentres(),
    countStudies(),
    countJournals(),
    countPendingCarouselEmails(),
    countPublicationEmails(),
  ])

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <Suspense fallback={null}>
          <PublicationsDashboardView
            articles={articles}
            studies={studies}
            locale={locale}
            authorRequests={authorRequests}
            journals={{ names: journalNames, currentYear: new Date().getFullYear() }}
          />
        </Suspense>
        <DashboardModules
          counts={{
            articles: articles.length,
            authors: authorCount,
            centres: centreCount,
            journals: journalCount,
            studies: studyCount,
            pendingCommunications,
            emails: emailCount,
          }}
        />
      </div>
    </div>
  )
}
