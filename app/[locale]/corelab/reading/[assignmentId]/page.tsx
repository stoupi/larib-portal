import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { prisma } from '@/lib/prisma'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; assignmentId: string }> }

export default async function ReadingPage({ params }: PageParams) {
  const { locale, assignmentId } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'corelab.patients.readings' })
  const assignment = await prisma.corelabReadingAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      userId: true,
      patient: { select: { code: true, studyId: true, site: { select: { code: true } }, exams: { select: { id: true } } } },
    },
  })
  if (!assignment || assignment.userId !== session.user.id) notFound()

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[900px] space-y-6">
        <Link href={`/corelab/studies/${assignment.patient.studyId}/readings`} className="text-sm text-text-secondary">
          {t('back')}
        </Link>
        <PageHeader
          title={assignment.patient.code}
          subtitle={`${assignment.patient.site.code} · ${assignment.patient.exams.length}`}
        />
        <p className="text-sm text-text-secondary">{t('comingSoon')}</p>
      </div>
    </div>
  )
}
