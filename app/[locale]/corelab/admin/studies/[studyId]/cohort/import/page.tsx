import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { getStudy } from '@/lib/services/corelab/studies'
import { CohortImportWizard } from './cohort-import-wizard'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function CohortImportPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/corelab'))

  const t = await getTranslations({ locale, namespace: 'corelab.cohort' })
  const study = await getStudy(studyId)
  if (!study) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <CohortImportWizard studyId={study.id} />
    </div>
  )
}
