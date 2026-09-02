import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { resolveStudyAccess } from '@/lib/corelab/guards'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getCurrentCrfVersion, getStudy } from '@/lib/services/corelab/studies'
import { listCases, piCalibrationOverview, readCaseExams, readValues } from '@/lib/services/corelab/calibration'
import { getStudyTraining } from '@/lib/services/corelab/training'
import { CaseDialogs } from './case-dialogs'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

function readerName(user: { firstName: string | null; lastName: string | null; email: string }): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name.length > 0 ? name : user.email
}

export default async function StudyCalibrationPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  try {
    await resolveStudyAccess(session.user, studyId, ['DATA_MANAGER', 'PI'])
  } catch {
    redirect(applicationLink(locale, '/corelab'))
  }

  const t = await getTranslations({ locale, namespace: 'corelab.calibration' })
  const study = await getStudy(studyId)
  if (!study) notFound()

  const [cases, readers, crfVersion] = await Promise.all([
    listCases(studyId),
    piCalibrationOverview(studyId),
    getCurrentCrfVersion(studyId),
  ])
  const sequenceCount = crfVersion?.definition.length ?? 0
  const eligibleReaders = readers.filter((reader) => reader.certificationPhase === 'CALIBRATION')
  const trainings = await Promise.all(readers.map((reader) => getStudyTraining(studyId, reader.userId)))

  const counters = [
    { label: t('counters.cases'), value: cases.length },
    { label: t('counters.goldComplete'), value: cases.filter((entry) => entry.goldStandardSignatureId).length },
    { label: t('counters.readers'), value: new Set(cases.flatMap((entry) => entry.assignments.map((assignment) => assignment.user.id))).size },
    { label: t('counters.awaiting'), value: readers.filter((reader) => reader.calibrationStatus === 'AWAITING_REVIEW').length },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {counters.map((counter) => (
          <div key={counter.label} className="rounded-2xl border border-border bg-white px-5 py-4">
            <div className="text-2xl font-light text-text-primary">{counter.value}</div>
            <div className="mt-1 text-xs text-text-secondary">{counter.label}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary">{t('casesTitle')}</h2>
          <CaseDialogs
            studyId={studyId}
            cases={cases.map((entry) => ({ id: entry.id, code: entry.code }))}
            readers={eligibleReaders.map((reader) => ({ id: reader.userId, label: readerName(reader.user) }))}
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          {cases.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('empty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('case')}</TableHead>
                  <TableHead>{t('exams')}</TableHead>
                  <TableHead>{t('goldStandard')}</TableHead>
                  <TableHead>{t('assignedTo')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((calibrationCase) => {
                  const exams = readCaseExams(calibrationCase.exams)
                  const filled = Object.values(readValues(calibrationCase.goldStandard))
                    .flatMap((examValues) => Object.keys(examValues)).length
                  return (
                    <TableRow key={calibrationCase.id}>
                      <TableCell className="font-medium text-text-primary">{calibrationCase.code}</TableCell>
                      <TableCell className="text-text-secondary">
                        {exams.length} · {exams.map((exam) => exam.timeLabel).join(', ')}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {calibrationCase.goldStandardSignatureId
                          ? t('goldSigned')
                          : filled === 0
                            ? t('goldNotStarted')
                            : t('goldStarted', { filled, total: sequenceCount })}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {calibrationCase.assignments.length === 0 ? '—' : t('readersCount', { count: calibrationCase.assignments.length })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/corelab/gold-standard/${calibrationCase.id}`}>
                            {filled === 0 ? t('enterGold') : t('editGold')}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-text-primary">{t('progressTitle')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('adminSubtitle')}</p>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reader')}</TableHead>
                <TableHead>{t('training')}</TableHead>
                <TableHead>{t('submittedCases')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {readers.map((reader, index) => {
                const training = trainings[index]
                const done = training?.modules.filter((module) => module.completed).length ?? 0
                return (
                  <TableRow key={reader.userId}>
                    <TableCell className="font-medium text-text-primary">{readerName(reader.user)}</TableCell>
                    <TableCell className="text-text-secondary">{done} / {training?.modules.length ?? 0}</TableCell>
                    <TableCell className="text-text-secondary">{reader.submitted} / {reader.assigned}</TableCell>
                    <TableCell className="text-text-secondary">{t(`statuses.${reader.calibrationStatus}`)}</TableCell>
                    <TableCell className="text-right">
                      {reader.readyForReview || reader.lastReview ? (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/corelab/studies/${studyId}/calibration/review/${reader.userId}`}>
                            {reader.lastReview ? t('seeReport') : t('review')}
                          </Link>
                        </Button>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
