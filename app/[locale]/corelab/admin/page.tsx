import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { prisma } from '@/lib/prisma'
import { listStudies } from '@/lib/services/corelab/studies'
import { StudyPhaseBadge } from '../components/study-phase-badge'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function CorelabAdminOverviewPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/corelab'))

  const t = await getTranslations({ locale, namespace: 'corelab.admin' })
  const now = new Date()

  const [studies, activeReaders, awaitingReview, lateReadings] = await Promise.all([
    listStudies(),
    prisma.corelabStudyMembership.count({ where: { removedAt: null, canRead: true } }),
    prisma.corelabPatient.count({ where: { status: 'UNDER_REVIEW' } }),
    prisma.corelabReadingAssignment.count({
      where: { status: { in: ['ASSIGNED', 'IN_PROGRESS', 'RETURNED'] }, dueDate: { lt: now } },
    }),
  ])

  const counters = [
    { label: t('studies'), value: studies.length },
    { label: t('inProduction'), value: studies.filter((study) => study.phase === 'PRODUCTION').length },
    { label: t('activeReaders'), value: activeReaders },
    { label: t('awaitingReview'), value: awaitingReview },
    { label: t('lateReadings'), value: lateReadings },
  ]

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={t('overviewTitle')} subtitle={t('overviewSubtitle')} />
        <Button asChild variant="outline">
          <Link href="/corelab/admin/studies">{t('openStudies')}</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {counters.map((counter) => (
          <div key={counter.label} className="rounded-2xl border border-border bg-white px-5 py-4">
            <div className="text-2xl font-light text-text-primary">{counter.value}</div>
            <div className="mt-1 text-xs text-text-secondary">{counter.label}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-white p-6">
        {studies.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('empty')}</p>
        ) : (
          <ul className="space-y-2">
            {studies.map((study) => (
              <li key={study.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
                <Link href={`/corelab/admin/studies/${study.id}`} className="text-sm font-medium text-text-primary">
                  {study.code} · {study.name}
                </Link>
                <StudyPhaseBadge phase={study.phase} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
