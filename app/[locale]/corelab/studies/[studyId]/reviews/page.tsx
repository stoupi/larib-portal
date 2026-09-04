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
import { listReviewsForUser } from '@/lib/services/corelab/reviews'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function MyReviewsPage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'corelab.review' })
  const tPatients = await getTranslations({ locale, namespace: 'corelab.patients' })
  const membership = await prisma.corelabStudyMembership.findFirst({
    where: { studyId, userId: session.user.id, removedAt: null },
    select: { id: true },
  })
  if (!membership) notFound()

  const reviews = await listReviewsForUser(studyId, session.user.id)

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1100px] space-y-6">
        <PageHeader title={t('listTitle')} subtitle={t('listSubtitle')} />
        <section className="rounded-2xl border border-border bg-white p-6">
          {reviews.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('listEmpty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('patient')}</TableHead>
                  <TableHead>{t('exams')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('dueDate')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium text-text-primary">{review.patient.code}</TableCell>
                    <TableCell className="text-text-secondary">{review.patient.exams.length}</TableCell>
                    <TableCell className="text-text-secondary">{tPatients(`statuses.${review.patient.status}`)}</TableCell>
                    <TableCell className="text-text-secondary">
                      {review.dueDate
                        ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(review.dueDate)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/corelab/review/${review.patient.id}`}>{t('open')}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </div>
  )
}
