import { getTranslations } from 'next-intl/server'
import { redirect, notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { getModuleForReader, getStudyTraining, getTrainingVideoUrl } from '@/lib/services/corelab/training'
import { DEFAULT_PASS_THRESHOLD } from '@/lib/corelab/training/progress'
import { prisma } from '@/lib/prisma'
import { ModuleVideo } from './module-video'
import { ModuleQuiz } from './module-quiz'

type PageParams = {
  params: Promise<{ locale: 'en' | 'fr'; moduleId: string }>
  searchParams: Promise<{ study?: string }>
}

export default async function TrainingModulePage({ params, searchParams }: PageParams) {
  const { locale, moduleId } = await params
  const { study: studyId } = await searchParams
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))
  if (!studyId) notFound()

  const t = await getTranslations({ locale, namespace: 'corelab.training' })
  const [readerModule, training] = await Promise.all([
    getModuleForReader(moduleId, session.user.id),
    getStudyTraining(studyId, session.user.id),
  ])
  if (!readerModule || !training) notFound()

  const locked = !readerModule.completed && training.nextModuleId !== moduleId
  const passThreshold = readerModule.type === 'QUIZ'
    ? (await prisma.corelabTrainingModule.findUniqueOrThrow({ where: { id: moduleId }, select: { passThreshold: true } })).passThreshold ?? DEFAULT_PASS_THRESHOLD
    : DEFAULT_PASS_THRESHOLD
  const videoUrl = readerModule.type === 'VIDEO' && !locked ? await getTrainingVideoUrl(moduleId, session.user) : null

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[900px] space-y-6">
        <Link href={`/corelab/studies/${studyId}/training`} className="text-sm text-text-secondary">
          {t('backToStudy')}
        </Link>
        <PageHeader
          title={readerModule.title}
          subtitle={[t(`type.${readerModule.type}`), t(`scope.${readerModule.scope}`), t('minutes', { count: readerModule.durationMinutes })].join(' · ')}
        />
        {readerModule.description ? <p className="text-sm text-text-secondary">{readerModule.description}</p> : null}

        {locked ? (
          <p className="text-sm text-text-secondary">{t('locked')}</p>
        ) : readerModule.type === 'VIDEO' ? (
          <ModuleVideo studyId={studyId} moduleId={moduleId} videoUrl={videoUrl} completed={readerModule.completed} />
        ) : readerModule.quiz ? (
          <ModuleQuiz studyId={studyId} moduleId={moduleId} quiz={readerModule.quiz} passThreshold={passThreshold} />
        ) : null}
      </div>
    </div>
  )
}
