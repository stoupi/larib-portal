import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { resolveStudyAccess } from '@/lib/corelab/guards'
import { prisma } from '@/lib/prisma'
import { getCurrentCrfVersion } from '@/lib/services/corelab/studies'
import { readCaseExams, readValues } from '@/lib/services/corelab/calibration'
import { GoldStandardClient } from './gold-standard-client'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; caseId: string }> }

export default async function GoldStandardPage({ params }: PageParams) {
  const { locale, caseId } = await params
  const session = await requireAuth()

  const calibrationCase = await prisma.corelabCalibrationCase.findUnique({
    where: { id: caseId },
    select: { id: true, code: true, studyId: true, exams: true, goldStandard: true, goldStandardSignatureId: true },
  })
  if (!calibrationCase) notFound()

  try {
    await resolveStudyAccess(session.user, calibrationCase.studyId, ['PI', 'DATA_MANAGER'])
  } catch {
    redirect(applicationLink(locale, '/corelab'))
  }

  const crfVersion = await getCurrentCrfVersion(calibrationCase.studyId)
  if (!crfVersion) notFound()

  const exams = readCaseExams(calibrationCase.exams).map((exam) => ({
    id: String(exam.index),
    label: `${exam.timeLabel || exam.date}`,
  }))

  return (
    <GoldStandardClient
      context={{
        studyId: calibrationCase.studyId,
        caseId: calibrationCase.id,
        caseCode: calibrationCase.code,
        readOnly: Boolean(calibrationCase.goldStandardSignatureId),
      }}
      definition={crfVersion.definition}
      exams={exams.length > 0 ? exams : [{ id: '1', label: '1' }]}
      initialValues={readValues(calibrationCase.goldStandard)}
    />
  )
}
