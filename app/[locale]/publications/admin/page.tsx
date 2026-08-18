import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { AdminAuthorRequests } from '@/app/[locale]/publications/components/admin-author-requests'
import { PublicationsDashboardView } from '@/app/[locale]/publications/components/admin-dashboard/dashboard-view'
import { listPendingAuthorRequests } from '@/lib/services/publications/author-requests'
import { listDashboardArticles } from '@/lib/services/publications/dashboard'
import { countAuthors } from '@/lib/services/publications/authors'
import { countCentres } from '@/lib/services/publications/centres'
import { countStudies, listStudyOptions } from '@/lib/services/publications/studies'
import { countJournals, listJournalNames } from '@/lib/services/publications/journals'
import { countPendingCarouselEmails } from '@/lib/services/publications/communication'

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
  ])

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <PublicationsDashboardView
          articles={articles}
          studies={studies}
          locale={locale}
          journals={{ names: journalNames, currentYear: new Date().getFullYear() }}
          moduleCounts={{
            articles: articles.length,
            authors: authorCount,
            centres: centreCount,
            journals: journalCount,
            studies: studyCount,
            pendingCommunications,
          }}
        />
        <AdminAuthorRequests requests={authorRequests} />
      </div>
    </div>
  )
}
