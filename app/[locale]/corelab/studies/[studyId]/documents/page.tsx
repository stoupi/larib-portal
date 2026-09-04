import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { studyDocuments } from '@/lib/services/corelab/documents'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function StudyDocumentsPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'corelab.reading.studyDocuments' })
  const membership = await prisma.corelabStudyMembership.findFirst({
    where: { studyId, userId: session.user.id, removedAt: null },
    select: { id: true },
  })
  if (!membership) notFound()

  const documents = await studyDocuments(studyId)

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[900px] space-y-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <section className="rounded-2xl border border-border bg-white p-6">
          {documents.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('empty')}</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">{document.title}</span>
                  <span className="text-text-secondary">{document.fileName}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
