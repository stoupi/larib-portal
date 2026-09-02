import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function CorelabAdminPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/corelab'))

  const t = await getTranslations({ locale, namespace: 'corelab' })

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />
        <p className="text-sm text-text-secondary">{t('admin.empty')}</p>
      </div>
    </div>
  )
}
