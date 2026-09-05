import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listBlocks, listValueSets, listVariables } from '@/lib/services/corelab/library'
import { LibraryTabs } from './library-tabs'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function CorelabLibraryPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/corelab'))

  const t = await getTranslations({ locale, namespace: 'corelab.library' })
  const [valueSets, variables, blocks] = await Promise.all([listValueSets(), listVariables(), listBlocks()])

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <LibraryTabs valueSets={valueSets} variables={variables} blocks={blocks} />
    </>
  )
}
