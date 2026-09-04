import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listMyTraining } from '@/lib/services/corelab/training'
import { ModuleCard } from '../components/module-card'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function MyTrainingPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'corelab.training' })
  const trainings = await listMyTraining(session.user.id)

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />

        {trainings.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('noStudy')}</p>
        ) : (
          trainings.map((training) => {
            const filled = training.modules.filter((module) => module.completed).length
            return (
              <section key={training.studyId} className="rounded-2xl border border-border bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">{training.studyName}</h2>
                    <p className="text-sm text-text-secondary">{training.studyCode}</p>
                  </div>
                  <span className={`text-sm ${training.complete && training.modules.length > 0 ? 'text-emerald-700' : 'text-text-secondary'}`}>
                    {training.modules.length === 0
                      ? t('empty')
                      : `${t('progress', { filled, required: training.modules.length })}${training.complete ? ` · ${t('complete')}` : ''}`}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {training.modules.length === 0 ? null : (
                    training.modules.map((module) => (
                      <ModuleCard
                        key={`${training.studyId}-${module.moduleId}`}
                        module={module}
                        locked={!module.completed && module.moduleId !== training.nextModuleId}
                        href={`/corelab/training/modules/${module.moduleId}?study=${training.studyId}`}
                      />
                    ))
                  )}
                </div>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}
