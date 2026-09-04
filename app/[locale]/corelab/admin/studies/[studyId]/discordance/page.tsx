import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { discordanceStats } from '@/lib/services/corelab/reviews'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; studyId: string }> }

export default async function DiscordancePage({ params }: PageParams) {
  const { locale, studyId } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/corelab'))

  const t = await getTranslations({ locale, namespace: 'corelab.review.discordance' })
  const stats = await discordanceStats(studyId)
  const percent = (value: number) => `${value.toFixed(1)} %`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: t('compared'), value: stats.totals.compared },
          { label: t('minor'), value: stats.totals.minor },
          { label: t('major'), value: stats.totals.major },
          { label: t('awaiting'), value: stats.totals.awaitingReview },
        ].map((counter) => (
          <div key={counter.label} className="rounded-2xl border border-border bg-white px-5 py-4">
            <div className="text-2xl font-light text-text-primary">{counter.value}</div>
            <div className="mt-1 text-xs text-text-secondary">{counter.label}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary">{t('variablesTitle')}</h3>
        {stats.variables.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">{t('empty')}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sequence')}</TableHead>
                  <TableHead>{t('comparedCount')}</TableHead>
                  <TableHead>{t('minorPercent')}</TableHead>
                  <TableHead>{t('majorPercent')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.variables.map((variable) => (
                  <TableRow key={`${variable.sequenceId}.${variable.fieldId}`}>
                    <TableCell>
                      <span className="font-medium text-text-primary">{variable.fieldId}</span>
                      <span className="block text-xs text-text-secondary">{variable.sequenceId}</span>
                    </TableCell>
                    <TableCell className="text-text-secondary">{variable.compared}</TableCell>
                    <TableCell className="text-text-secondary">{percent(variable.minorPercent)}</TableCell>
                    <TableCell className="text-text-secondary">{percent(variable.majorPercent)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary">{t('pairsTitle')}</h3>
        {stats.pairs.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">{t('empty')}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pair')}</TableHead>
                  <TableHead>{t('examsCount')}</TableHead>
                  <TableHead>{t('discordantPercent')}</TableHead>
                  <TableHead>{t('state')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.pairs.map((pair) => (
                  <TableRow key={pair.pair}>
                    <TableCell className="text-text-primary">{pair.names.join(' · ')}</TableCell>
                    <TableCell className="text-text-secondary">{pair.exams}</TableCell>
                    <TableCell className="text-text-secondary">{percent(pair.discordantPercent)}</TableCell>
                    <TableCell className={pair.majorPercent > 3 ? 'text-amber-700' : 'text-emerald-700'}>
                      {pair.majorPercent > 3 ? t('watch') : t('consistent')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
