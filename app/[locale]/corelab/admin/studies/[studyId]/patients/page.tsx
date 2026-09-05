import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { getStudy } from '@/lib/services/corelab/studies'
import { listPatients } from '@/lib/services/corelab/cohort'
import { workload } from '@/lib/services/corelab/assignments'
import { readerCandidates, reviewerCandidates } from '@/lib/corelab/assignment/rules'
import { PatientsTable } from './patients-table'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

function personName(user: { firstName: string | null; lastName: string | null; email: string }): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email
}

export default async function StudyPatientsPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/corelab'))

  const t = await getTranslations({ locale, namespace: 'corelab.patients' })
  const study = await getStudy(studyId)
  if (!study) notFound()
  const closed = study.phase === 'CLOSED'

  const [patients, members, load] = await Promise.all([
    listPatients(studyId),
    prisma.corelabStudyMembership.findMany({
      where: { studyId, removedAt: null },
      select: {
        userId: true, canRead: true, canAdjudicate: true, canAuthorReference: true, certificationPhase: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    workload(studyId),
  ])

  const nameOf = new Map(members.map((member) => [member.userId, personName(member.user)]))
  const readers = readerCandidates(members).map((member) => ({ value: member.userId, label: nameOf.get(member.userId) ?? member.userId }))
  const reviewers = reviewerCandidates(members, []).map((member) => ({ value: member.userId, label: nameOf.get(member.userId) ?? member.userId }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('subtitle')}</p>
        </div>
        {closed ? null : (
          <Button asChild variant="outline">
            <Link href={`/corelab/admin/studies/${studyId}/cohort/import`}>{t('importCohort')}</Link>
          </Button>
        )}
      </div>

      <section className="rounded-2xl border border-border bg-white p-6">
        {patients.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('empty')}</p>
        ) : (
          <PatientsTable studyId={studyId} patients={patients} readers={readers} reviewers={reviewers} readOnly={closed} />
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-6">
          <h3 className="text-base font-semibold text-text-primary">{t('workload')}</h3>
          {load.readers.length === 0 ? (
            <p className="mt-2 text-sm text-text-secondary">{t('noWorkload')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {load.readers.map((reader) => (
                <li key={reader.userId} className="flex items-center justify-between text-sm" data-testid={`workload-${reader.userId}`}>
                  <span className="text-text-primary">{reader.name}</span>
                  <span className="text-text-secondary">{t('pairLine', { patients: reader.patients, exams: reader.exams })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-white p-6">
          <h3 className="text-base font-semibold text-text-primary">{t('pairs')}</h3>
          {load.pairs.length === 0 ? (
            <p className="mt-2 text-sm text-text-secondary">{t('noWorkload')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {load.pairs.map((pair) => (
                <li key={pair.pair} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">
                    {pair.pair.split('|').map((userId) => nameOf.get(userId) ?? userId).join(' · ')}
                  </span>
                  <span className="text-text-secondary">{t('pairLine', { patients: pair.patients, exams: pair.exams })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
