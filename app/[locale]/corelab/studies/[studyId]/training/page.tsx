import { getTranslations } from 'next-intl/server'
import { redirect, notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { getStudyTraining } from '@/lib/services/corelab/training'
import { ModuleCard } from '../../../components/module-card'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function StudyTrainingPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'corelab.training' })
  const training = await getStudyTraining(studyId, session.user.id)
  if (!training) notFound()

  const filled = training.modules.filter((module) => module.completed).length

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1000px] space-y-6">
        <PageHeader title={t('studyTitle', { code: training.studyCode })} subtitle={t('studySubtitle')} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white px-6 py-4">
          <span className="text-sm text-text-secondary" data-testid="study-training-progress">
            {t('progress', { filled, required: training.modules.length })}
          </span>
          {training.trainingDueAt ? (
            <span className="text-sm text-text-secondary">
              {t('dueAt', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(training.trainingDueAt) })}
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          {training.modules.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('empty')}</p>
          ) : (
            training.modules.map((module) => (
              <ModuleCard
                key={module.moduleId}
                module={module}
                locked={!module.completed && module.moduleId !== training.nextModuleId}
                href={`/corelab/training/modules/${module.moduleId}?study=${training.studyId}`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
