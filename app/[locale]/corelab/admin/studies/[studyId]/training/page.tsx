import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { getStudy } from '@/lib/services/corelab/studies'
import { listModulesForStudyAdmin } from '@/lib/services/corelab/training'
import { RequirementsForm } from './requirements-form'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function StudyRequirementsPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const t = await getTranslations({ locale, namespace: 'corelab.training.admin' })

  const study = await getStudy(studyId)
  if (!study) notFound()
  const { requirements, available } = await listModulesForStudyAdmin(studyId)

  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <h2 className="text-lg font-semibold text-text-primary">{t('requirementsTitle')}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t('requirementsSubtitle')}</p>
      <div className="mt-5">
        {available.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('empty')}</p>
        ) : (
          <RequirementsForm
            studyId={study.id}
            available={available}
            initialModuleIds={requirements.map((requirement) => requirement.moduleId)}
          />
        )}
      </div>
    </section>
  )
}
