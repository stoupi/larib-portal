import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { getStudy } from '@/lib/services/corelab/studies'
import { studyDocuments } from '@/lib/services/corelab/documents'
import { StudyDocumentUpload } from './study-document-upload'
import { DownloadButton } from '../../../../components/download-button'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function AdminStudyDocumentsPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/corelab'))

  const t = await getTranslations({ locale, namespace: 'corelab.reading.studyDocuments' })
  const study = await getStudy(studyId)
  if (!study) notFound()

  const documents = await studyDocuments(studyId)

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary">{t('adminSubtitle')}</p>
      </section>

      {study.phase === 'CLOSED' ? null : (
        <section className="rounded-2xl border border-border bg-white p-6">
          <StudyDocumentUpload studyId={studyId} />
        </section>
      )}

      <section className="rounded-2xl border border-border bg-white p-6">
        {documents.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('empty')}</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((document) => (
              <li key={document.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-text-primary">{document.title}</span>
                <span className="ml-auto text-text-secondary">{document.fileName}</span>
                <DownloadButton studyId={studyId} documentId={document.id} kind="STUDY" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
