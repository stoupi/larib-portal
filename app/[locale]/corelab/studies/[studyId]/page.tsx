import { getTranslations } from 'next-intl/server'
import { redirect, notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { StudyPhaseBadge } from '../../components/study-phase-badge'
import { PhaseTrack } from '../../components/phase-track'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function ReaderStudyPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'corelab' })
  const membership = await prisma.corelabStudyMembership.findFirst({
    where: { studyId, userId: session.user.id, removedAt: null },
    select: {
      role: true,
      certificationPhase: true,
      study: { select: { name: true, code: true, phase: true, modalities: true } },
    },
  })
  if (!membership) notFound()

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
        <PhaseTrack phase={membership.role === 'PI' ? null : membership.certificationPhase} />
        <p className="text-sm text-text-secondary">{t('study.comingSoon')}</p>
      </div>
    </div>
  )
}
