import { getTranslations } from 'next-intl/server'
import { redirect, notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { StudyPhaseBadge } from '../../components/study-phase-badge'
import { PhaseTrack } from '../../components/phase-track'
import { getStudyTraining } from '@/lib/services/corelab/training'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function ReaderStudyPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'corelab' })
  const membership = await prisma.corelabStudyMembership.findFirst({
    where: { studyId, userId: session.user.id, removedAt: null },
    select: {
      canRead: true,
      canAdjudicate: true,
      canAuthorReference: true,
      canCertify: true,
      certificationPhase: true,
      study: { select: { name: true, code: true, phase: true, modalities: true } },
    },
  })
  if (!membership) notFound()

  const training = membership.canRead ? await getStudyTraining(studyId, session.user.id) : null
  const filled = training?.modules.filter((module) => module.completed).length ?? 0

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            title={membership.study.name}
            subtitle={[membership.study.code, ...membership.study.modalities].join(' · ')}
          />
          <StudyPhaseBadge phase={membership.study.phase} />
        </div>

        <PhaseTrack phase={membership.canRead ? membership.certificationPhase : null} />

        {membership.certificationPhase !== 'TRAINING' && membership.canRead ? (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-6">
            <div>
              <h2 className="text-base font-semibold text-text-primary">{t('calibration.reader_.title')}</h2>
              <p className="mt-0.5 text-sm text-text-secondary">{t('calibration.reader_.subtitle')}</p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/corelab/studies/${studyId}/calibration`}>{t('calibration.title')}</Link>
            </Button>
          </section>
        ) : null}

        {training && training.modules.length > 0 ? (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-6">
            <div>
              <h2 className="text-base font-semibold text-text-primary">{t('training.studyTitle', { code: membership.study.code })}</h2>
              <p className="mt-0.5 text-sm text-text-secondary">
                {t('training.progress', { filled, required: training.modules.length })}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/corelab/studies/${studyId}/training`}>{t('training.open')}</Link>
            </Button>
          </section>
        ) : (
          <p className="text-sm text-text-secondary">{t('study.comingSoon')}</p>
        )}
      </div>
    </div>
  )
}
