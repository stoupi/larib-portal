import { getTranslations } from 'next-intl/server'
import { redirect, notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { prisma } from '@/lib/prisma'
import { readerCalibrationOverview, readValues } from '@/lib/services/corelab/calibration'
import { buildComparison } from '@/lib/corelab/calibration/comparison'
import { ComparisonTable } from './comparison-table'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function ReaderCalibrationPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'corelab.calibration' })
  const membership = await prisma.corelabStudyMembership.findFirst({
    where: { studyId, userId: session.user.id, removedAt: null },
    select: { id: true },
  })
  if (!membership) notFound()

  const { assignments, lastReview, crfVersion } = await readerCalibrationOverview(studyId, session.user.id)
  const comments = (lastReview?.comments ?? {}) as Record<string, string>

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <PageHeader title={t('reader_.title')} subtitle={t('reader_.subtitle')} />

        {lastReview ? (
          <div className="rounded-2xl border border-border bg-white p-4 text-sm text-text-primary">
            {t('reader_.lastDecision', { decision: t(`reader_.decisions.${lastReview.decision}`) })}
          </div>
        ) : null}

        {assignments.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('reader_.empty')}</p>
        ) : (
          assignments.map((assignment) => {
            const rows = crfVersion
              ? buildComparison(crfVersion.definition, readValues(assignment.values), readValues(assignment.case.goldStandard))
              : []
            const reviewed = assignment.status === 'SUBMITTED' || assignment.status === 'REVIEWED'
            return (
              <section key={assignment.id} className="rounded-2xl border border-border bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">{assignment.case.code}</h2>
                    <p className="text-sm text-text-secondary">{t(`assignmentStatuses.${assignment.status}`)}</p>
                  </div>
                  {reviewed ? null : (
                    <Button asChild variant="outline">
                      <Link href={`/corelab/calibration/case/${assignment.id}`}>{t('reader_.openCase')}</Link>
                    </Button>
                  )}
                </div>
                {reviewed && rows.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-text-primary">{t('reader_.comparisonTitle')}</h3>
                    <div className="mt-2">
                      <ComparisonTable rows={rows} comments={comments} />
                    </div>
                  </div>
                ) : null}
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}
