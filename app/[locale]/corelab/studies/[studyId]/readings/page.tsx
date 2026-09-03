import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { prisma } from '@/lib/prisma'
import { listMyAssignments } from '@/lib/services/corelab/assignments'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function MyReadingsPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'corelab.patients.readings' })
  const membership = await prisma.corelabStudyMembership.findFirst({
    where: { studyId, userId: session.user.id, removedAt: null },
    select: { id: true },
  })
  if (!membership) notFound()

  const assignments = await listMyAssignments(session.user.id, studyId)
  const formatDate = (value: Date) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(value)

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />

        <section className="rounded-2xl border border-border bg-white p-6">
          {assignments.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('patient')}</TableHead>
                    <TableHead>{t('modality')}</TableHead>
                    <TableHead>{t('exams')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('dueDate')}</TableHead>
                    <TableHead>{t('action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium text-text-primary">{assignment.patient.code}</TableCell>
                      <TableCell className="text-text-secondary">
                        {[...new Set(assignment.patient.exams.map((exam) => exam.modality))].join(', ')}
                      </TableCell>
                      <TableCell className="text-text-secondary">{assignment.patient.exams.length}</TableCell>
                      <TableCell className="text-text-secondary">{t(`statuses.${assignment.status}`)}</TableCell>
                      <TableCell className="text-text-secondary">
                        {assignment.dueDate ? formatDate(assignment.dueDate) : '—'}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/corelab/reading/${assignment.id}`}>
                            {assignment.status === 'ASSIGNED' ? t('start') : t('resume')}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
