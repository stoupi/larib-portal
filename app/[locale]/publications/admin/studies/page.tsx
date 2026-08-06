import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { listStudies } from '@/lib/services/publications/studies'
import { listAuthorOptions } from '@/lib/services/publications/authors'
import { listCentres } from '@/lib/services/publications/centres'
import { StudiesManager } from '@/app/[locale]/publications/components/studies-manager'
import { BackToDashboard } from '@/app/[locale]/publications/components/back-to-dashboard'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function PublicationsStudiesPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
  const [studies, authors, centres] = await Promise.all([listStudies(), listAuthorOptions(), listCentres()])
  return (
    <div className="flex h-[100dvh] flex-col gap-3 overflow-hidden p-4 md:p-6">
      <BackToDashboard locale={locale} />
      <StudiesManager studies={studies} authors={authors} centres={centres} />
    </div>
  )
}
