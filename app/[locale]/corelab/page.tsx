import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listStudiesForUser } from '@/lib/services/corelab/studies'
import { StudyCards } from './components/study-cards'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function CorelabHomePage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'corelab' })
  const memberships = await listStudiesForUser(session.user.id)

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <PageHeader
          title={t('title')}
          subtitle={memberships.length === 0 ? t('home.subtitle') : t('home.readerSubtitle')}
        />
        {memberships.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('home.empty')}</p>
        ) : (
          <StudyCards memberships={memberships} />
        )}
      </div>
    </div>
  )
}
