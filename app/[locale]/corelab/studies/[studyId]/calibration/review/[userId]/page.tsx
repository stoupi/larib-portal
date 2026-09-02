import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { resolveStudyAccess } from '@/lib/corelab/guards'
import { prisma } from '@/lib/prisma'
import { piReviewData, readValues } from '@/lib/services/corelab/calibration'
import { buildComparison } from '@/lib/corelab/calibration/comparison'
import { ReviewClient } from './review-client'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string; userId: string }> }

export default async function CalibrationReviewPage({ params }: PageParams) {
  const { locale, studyId, userId } = await params
  const session = await requireAuth()
  try {
    await resolveStudyAccess(session.user, studyId, ['PI', 'DATA_MANAGER'])
  } catch {
    redirect(applicationLink(locale, '/corelab'))
  }

  const reader = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  })
  if (!reader) notFound()

  const { assignments, crfVersion, lastReview } = await piReviewData(studyId, userId)
  const cases = crfVersion
    ? assignments
        .filter((assignment) => assignment.status === 'SUBMITTED' || assignment.status === 'REVIEWED')
        .map((assignment) => ({
          id: assignment.id,
          code: assignment.case.code,
          rows: buildComparison(crfVersion.definition, readValues(assignment.values), readValues(assignment.case.goldStandard)),
        }))
    : []

  const name = [reader.firstName, reader.lastName].filter(Boolean).join(' ').trim() || reader.email

  return (
    <ReviewClient
      context={{ studyId, userId, readerName: name, backHref: `/corelab/admin/studies/${studyId}/calibration` }}
      cases={cases}
      initialComments={(lastReview?.comments ?? {}) as Record<string, string>}
    />
  )
}
