import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { getCurrentCrfVersion, getStudy } from '@/lib/services/corelab/studies'
import { CrfPreview } from '@/app/[locale]/corelab/components/crf/crf-preview'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function CrfPreviewPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const t = await getTranslations({ locale, namespace: 'corelab.form.preview' })

  const study = await getStudy(studyId)
  if (!study) notFound()
  const crfVersion = await getCurrentCrfVersion(studyId)

  if (!crfVersion) {
    return <p className="p-8 text-sm text-text-secondary">{t('noCrf')}</p>
  }

  return <CrfPreview definition={crfVersion.definition} study={{ id: study.id, code: study.code, name: study.name }} />
}
