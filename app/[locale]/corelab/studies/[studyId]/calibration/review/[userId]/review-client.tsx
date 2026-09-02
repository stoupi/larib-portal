'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FocusShell } from '@/app/[locale]/corelab/components/crf/focus-shell'
import { SignatureDialog } from '@/app/[locale]/corelab/components/signature-dialog'
import { decideCalibrationAction } from '@/app/[locale]/corelab/actions-calibration'
import { comparisonTotals, type ComparisonRow } from '@/lib/corelab/calibration/comparison'

type Decision = 'CERTIFY' | 'ADDITIONAL_CASES' | 'FAIL'

type ReviewClientProps = {
  context: { studyId: string; userId: string; readerName: string; backHref: string }
  cases: Array<{ id: string; code: string; rows: ComparisonRow[] }>
  initialComments: Record<string, string>
}

function display(value: unknown): string {
  if (value === null || value === undefined || typeof value === 'object') return '—'
  return String(value)
}

export function ReviewClient({ context, cases, initialComments }: ReviewClientProps) {
  const t = useTranslations('corelab.calibration')
  const tReader = useTranslations('corelab.calibration.reader_')
  const router = useRouter()
  const [activeCaseId, setActiveCaseId] = useState(cases[0]?.id ?? '')
  const [onlyDifferences, setOnlyDifferences] = useState(false)
  const [comments, setComments] = useState<Record<string, string>>(initialComments)
  const [decision, setDecision] = useState<Decision | null>(null)

  const action = useAction(decideCalibrationAction, {
    onSuccess: () => {
      toast.success(t('decided'))
      setDecision(null)
      router.push(context.backHref)
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  const activeCase = cases.find((entry) => entry.id === activeCaseId) ?? cases[0]
  const allRows = cases.flatMap((entry) => entry.rows)
  const totals = comparisonTotals(allRows)
  const visibleRows = (activeCase?.rows ?? []).filter(
    (row) => !onlyDifferences || !row.verdict.withinTolerance || (row.discordantSegments ?? 0) > 0,
  )

  return (
    <FocusShell
      header={{
        backHref: context.backHref,
        backLabel: t('backToCalibration'),
        title: t('piReviewTitle', { name: context.readerName }),
        subtitle: t('piReviewSubtitle'),
      }}
      actions={
        <>
          <span className="text-xs text-emerald-700">{t('withinCount', { count: totals.within })}</span>
          <span className="text-xs text-red-600">{t('outsideCount', { count: totals.outside })}</span>
          <Button size="sm" onClick={() => setDecision('CERTIFY')}>{t('certify')}</Button>
          <Button size="sm" variant="outline" onClick={() => setDecision('ADDITIONAL_CASES')}>{t('additionalCases')}</Button>
          <Button size="sm" variant="outline" onClick={() => setDecision('FAIL')}>{t('fail')}</Button>
        </>
      }
      aside={
        <nav className="space-y-1">
          {cases.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setActiveCaseId(entry.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                entry.id === activeCase?.id ? 'bg-navy-700 text-white' : 'text-text-primary hover:bg-neutral-100'
              }`}
            >
              {entry.code}
            </button>
          ))}
        </nav>
      }
    >
      {cases.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('noSubmission')}</p>
      ) : (
        <>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setOnlyDifferences((current) => !current)}>
              {onlyDifferences ? tReader('allFields') : t('onlyDifferences')}
            </Button>
          </div>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tReader('variable')}</TableHead>
                  <TableHead>{t('reader')}</TableHead>
                  <TableHead>{tReader('gold')}</TableHead>
                  <TableHead>{tReader('gap')}</TableHead>
                  <TableHead>{tReader('verdict')}</TableHead>
                  <TableHead>{tReader('comment')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>
                      <span className="font-medium text-text-primary">{row.fieldName}</span>
                      <span className="block text-xs text-text-secondary">{row.sequenceName}</span>
                    </TableCell>
                    <TableCell className="text-text-secondary">{display(row.readerValue)}</TableCell>
                    <TableCell className="text-text-secondary">{display(row.goldValue)}</TableCell>
                    <TableCell className="text-text-secondary">
                      {row.discordantSegments !== null
                        ? tReader('segmentsDiscordant', { count: row.discordantSegments })
                        : row.verdict.delta === null
                          ? '—'
                          : row.verdict.delta.toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <span className={row.verdict.rule === 'not_compared' ? 'text-text-secondary' : row.verdict.withinTolerance ? 'text-emerald-700' : 'text-red-600'}>
                        {row.verdict.rule === 'not_compared' ? tReader('notCompared') : row.verdict.withinTolerance ? tReader('within') : tReader('outside')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={`${tReader('comment')} ${row.fieldName}`}
                        value={comments[row.key] ?? ''}
                        onChange={(event) => setComments((current) => ({ ...current, [row.key]: event.target.value }))}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <SignatureDialog
        open={decision !== null}
        onOpenChange={(open) => setDecision(open ? decision : null)}
        title={decision ? t(decision === 'CERTIFY' ? 'certify' : decision === 'FAIL' ? 'fail' : 'additionalCases') : ''}
        summary={`${t('withinCount', { count: totals.within })} · ${t('outsideCount', { count: totals.outside })}`}
        onConfirm={({ password, reason }) => {
          if (!decision) return
          action.execute({ studyId: context.studyId, userId: context.userId, decision, comments, password, reason })
        }}
      />
    </FocusShell>
  )
}
