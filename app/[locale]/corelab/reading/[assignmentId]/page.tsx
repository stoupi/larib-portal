import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { getReadingForUser } from '@/lib/services/corelab/readings'
import { openReturnFor } from '@/lib/services/corelab/document-returns'
import { openReworkFor } from '@/lib/services/corelab/reviews'
import { getCurrentCrfVersion } from '@/lib/services/corelab/studies'
import { ReadingClient } from './reading-client'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; assignmentId: string }> }

export default async function ReadingPage({ params }: PageParams) {
  const { locale, assignmentId } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'corelab.reading' })
  const context = await getReadingForUser(assignmentId, session.user.id)
  if (!context) notFound()

  const [documentReturn, crfVersion, rework] = await Promise.all([
    openReturnFor(context.assignment.patient.id),
    getCurrentCrfVersion(context.assignment.patient.studyId),
    openReworkFor(context.assignment.patient.id),
  ])

  const mode = context.assignment.role === 'REVIEWER'
    ? t('review')
    : context.assignment.patient.readingMode === 'DOUBLE' ? t('double') : t('single')

  const stateKey = [
    Object.values(context.values).flatMap((exam) => Object.values(exam).flatMap((sequence) => Object.keys(sequence))).length,
    context.documents.length,
    context.assignment.status,
  ].join('-')

  return (
    <ReadingClient
      key={stateKey}
      context={{
        assignmentId: context.assignment.id,
        studyId: context.assignment.patient.studyId,
        title: t('title', { code: context.assignment.patient.code }),
        subtitle: t('subtitle', {
          study: context.assignment.patient.study.code,
          site: context.assignment.patient.site.code,
          mode,
        }),
        readOnly: !context.editable,
        crfVersionLabel: crfVersion ? `v${crfVersion.number}` : '—',
      }}
      definition={context.definition}
      exams={context.assignment.patient.exams.map((exam) => ({
        id: exam.id,
        label: exam.timeLabel || `${exam.index}`,
      }))}
      initialValues={context.values}
      extras={{
        slots: context.slots,
        documents: context.documents,
        openFlags: context.flags.length,
        flags: context.flags.map((flag) => ({ examId: flag.examId, sequenceId: flag.sequenceId, category: flag.category, note: flag.note })),
        documentReturn: documentReturn && context.assignment.status === 'RETURNED'
          ? { id: documentReturn.id, message: documentReturn.message, slotKeys: documentReturn.slotKeys }
          : null,
        rework: rework && context.assignment.status === 'RETURNED'
          ? {
              id: rework.id,
              points: rework.items
                .filter((item) => item.readerAssignmentId === context.assignment.id)
                .map((item) => ({
                  key: `${item.readerAssignmentId}.${item.sequenceId}`,
                  sequenceName: context.definition.find((sequence) => sequence.id === item.sequenceId)?.name ?? item.sequenceId,
                  comment: rework.comments[`${item.readerAssignmentId}.${item.sequenceId}`] ?? '',
                })),
            }
          : null,
      }}
    />
  )
}
