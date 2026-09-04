import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getReviewForUser } from '@/lib/services/corelab/reviews'
import { comparedKey } from '@/lib/corelab/review/compare'
import { ReviewClient, type ComparedRow } from './review-client'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; patientId: string }> }

export default async function ReviewPage({ params }: PageParams) {
  const { locale, patientId } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'corelab.review' })
  const context = await getReviewForUser(patientId, session.user.id)
  if (!context) {
    const patient = await prisma.corelabPatient.findUnique({ where: { id: patientId }, select: { studyId: true } })
    if (!patient) notFound()
    redirect(applicationLink(locale, `/corelab/studies/${patient.studyId}/reviews`))
  }

  const study = await prisma.corelabStudy.findUniqueOrThrow({
    where: { id: context.patient.studyId },
    select: { code: true },
  })
  const sequenceName = new Map(context.definition.map((sequence) => [sequence.id, sequence.name]))

  const rows: ComparedRow[] = context.compared.map((entry) => ({
    key: comparedKey(entry),
    examId: entry.examId,
    sequenceId: entry.sequenceId,
    sequenceName: sequenceName.get(entry.sequenceId) ?? entry.sequenceId,
    fieldId: entry.fieldId,
    fieldName: entry.field.name,
    unit: entry.field.unit ?? null,
    r1: entry.r1?.value ?? null,
    r2: entry.r2?.value ?? null,
    level: entry.level,
    average: entry.average,
    discordantSegments: entry.segmentDiff?.count ?? null,
  }))

  const initialDecisions = Object.fromEntries(
    context.decisions.map((decision) => [
      comparedKey(decision),
      { decision: decision.decision, customValue: decision.customValue },
    ]),
  )

  return (
    <ReviewClient
      context={{
        patientId: context.patient.id,
        studyId: context.patient.studyId,
        title: t('title', { code: context.patient.code }),
        subtitle: t('subtitle', { study: study.code }),
        reworkPending: context.pendingRework,
      }}
      rows={rows}
      initialDecisions={initialDecisions}
      readers={context.readers.map((reader) => ({ assignmentId: reader.assignmentId, name: reader.name }))}
      sequences={context.definition.map((sequence) => ({ id: sequence.id, name: sequence.name }))}
    />
  )
}
