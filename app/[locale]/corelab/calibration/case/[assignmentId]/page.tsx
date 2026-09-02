import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { getCurrentCrfVersion } from '@/lib/services/corelab/studies'
import { getAssignmentForReader, readCaseExams, readValues } from '@/lib/services/corelab/calibration'
import { CalibrationCaseClient } from './calibration-case-client'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; assignmentId: string }> }

export default async function CalibrationCasePage({ params }: PageParams) {
  const { locale, assignmentId } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const assignment = await getAssignmentForReader(assignmentId, session.user.id)
  if (!assignment) notFound()

  const crfVersion = await getCurrentCrfVersion(assignment.case.studyId)
  if (!crfVersion) notFound()

  const exams = readCaseExams(assignment.case.exams).map((exam) => ({
    id: String(exam.index),
    label: exam.timeLabel || exam.date,
  }))

  return (
    <CalibrationCaseClient
      context={{
        studyId: assignment.case.studyId,
        assignmentId: assignment.id,
        caseCode: assignment.case.code,
        readOnly: assignment.status === 'SUBMITTED' || assignment.status === 'REVIEWED',
      }}
      definition={crfVersion.definition}
      exams={exams.length > 0 ? exams : [{ id: '1', label: '1' }]}
      initialValues={readValues(assignment.values)}
    />
  )
}
