import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { listAuthors, listLinkableUsers } from '@/lib/services/publications/authors'
import { listCentres } from '@/lib/services/publications/centres'
import { AuthorsManager } from '@/app/[locale]/publications/components/authors-manager'
import { BackToDashboard } from '@/app/[locale]/publications/components/back-to-dashboard'
import { PUBLICATIONS_ADMIN_BASE } from '@/lib/publications/base-path'

type PageParams = {
  params: Promise<{ locale: 'en' | 'fr' }>
}

export default async function PublicationsAuthorsPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()

  if (!canAdminApp(session.user, 'PUBLICATIONS')) {
    redirect(applicationLink(locale, '/publications'))
  }

  const [authors, users, centres] = await Promise.all([listAuthors(), listLinkableUsers(), listCentres()])

  return (
    <div className="flex h-[100dvh] flex-col gap-3 overflow-hidden p-4 md:p-6">
      <BackToDashboard locale={locale} />
      <Suspense fallback={null}>
        <AuthorsManager authors={authors} users={users} centres={centres} basePath={PUBLICATIONS_ADMIN_BASE} />
      </Suspense>
    </div>
  )
}
