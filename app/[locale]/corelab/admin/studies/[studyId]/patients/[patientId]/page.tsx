import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { listSlots } from '@/lib/services/corelab/documents'
import { DownloadButton } from '../../../../../components/download-button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReturnDialog } from './return-dialog'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string; patientId: string }> }

export default async function AdminPatientPage({ params }: PageParams) {
  const { locale, studyId, patientId } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/corelab'))

  const t = await getTranslations({ locale, namespace: 'corelab.reading.admin' })
  const tPatients = await getTranslations({ locale, namespace: 'corelab.patients' })

  const patient = await prisma.corelabPatient.findUnique({
    where: { id: patientId },
    select: {
      code: true,
      status: true,
      site: { select: { code: true } },
      assignments: {
        select: {
          id: true, role: true, status: true,
          user: { select: { firstName: true, lastName: true, email: true } },
          documents: { select: { id: true, slotKey: true, fileName: true, status: true } },
          submissions: { select: { id: true, version: true, submittedAt: true, snapshotHash: true }, orderBy: { version: 'desc' } },
        },
      },
    },
  })
  if (!patient) notFound()
  const slots = await listSlots(studyId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{t('patientTitle', { code: patient.code })}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {patient.site.code} · {tPatients(`statuses.${patient.status}`)}
          </p>
        </div>
        <ReturnDialog studyId={studyId} patientId={patientId} slots={slots} />
      </div>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary">{t('assignments')}</h3>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tPatients('reader1')}</TableHead>
                <TableHead>{tPatients('status')}</TableHead>
                <TableHead>{t('submissions')}</TableHead>
                <TableHead>{tPatients('readings.title')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patient.assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="text-text-primary">
                    {[assignment.user.firstName, assignment.user.lastName].filter(Boolean).join(' ') || assignment.user.email}
                    <span className="block text-xs text-text-secondary">{assignment.role}</span>
                  </TableCell>
                  <TableCell className="text-text-secondary">{tPatients(`readings.statuses.${assignment.status}`)}</TableCell>
                  <TableCell className="text-text-secondary">
                    {assignment.submissions.length === 0
                      ? t('noSubmission')
                      : assignment.submissions.map((submission) => t('version', { version: submission.version })).join(', ')}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {assignment.documents.length === 0
                      ? '—'
                      : assignment.documents.map((document) => (
                          <span key={document.id} className="mr-2 inline-flex items-center gap-1 whitespace-nowrap">
                            {document.fileName} ({document.status})
                            <DownloadButton studyId={studyId} documentId={document.id} kind="READING" />
                          </span>
                        ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
