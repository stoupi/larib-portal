import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { getReadingForUser } from '@/lib/services/corelab/readings'
import { openReturnFor } from '@/lib/services/corelab/document-returns'
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

  const [documentReturn, crfVersion] = await Promise.all([
    openReturnFor(context.assignment.patient.id),
    getCurrentCrfVersion(context.assignment.patient.studyId),
  ])

  const mode = context.assignment.role === 'REVIEWER'
    ? t('review')
    : context.assignment.patient.readingMode === 'DOUBLE' ? t('double') : t('single')

  return (
    <ReadingClient
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
        documentReturn: documentReturn && context.assignment.status === 'RETURNED'
          ? { id: documentReturn.id, message: documentReturn.message, slotKeys: documentReturn.slotKeys }
          : null,
      }}
    />
  )
}
