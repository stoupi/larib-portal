'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { commitCohortImportAction, previewCohortImportAction } from '../../../../actions-cohort'
import type { CohortReport } from '@/lib/services/corelab/cohort'

const VERDICT_STYLE: Record<string, string> = {
  READY: 'text-emerald-700',
  WARNING: 'text-amber-700',
  BLOCKED: 'text-red-600',
}

export function CohortImportWizard({ studyId }: { studyId: string }) {
  const t = useTranslations('corelab.cohort')
  const router = useRouter()
  const [file, setFile] = useState<{ key: string; name: string } | null>(null)
  const [report, setReport] = useState<CohortReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [onlyIssues, setOnlyIssues] = useState(true)

  const preview = useAction(previewCohortImportAction, {
    onSuccess: ({ data }) => {
      setReport(data ?? null)
      setBusy(false)
    },
    onError: () => {
      toast.error(t('error'))
      setBusy(false)
    },
  })

  const commit = useAction(commitCohortImportAction, {
    onSuccess: ({ data }) => {
      toast.success(t('imported', { rows: data?.importedRows ?? 0, patients: data?.patientsCreated ?? 0 }))
      router.push(`/corelab/admin/studies/${studyId}/patients`)
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  async function upload(selected: File) {
    setBusy(true)
    const body = new FormData()
    body.append('file', selected)
    body.append('studyId', studyId)
    const response = await fetch('/api/corelab/uploads/cohort', { method: 'POST', body })
    if (!response.ok) {
      toast.error(t('error'))
      setBusy(false)
      return
    }
    const uploaded = (await response.json()) as { key: string; fileName: string }
    setFile({ key: uploaded.key, name: uploaded.fileName })
    preview.execute({ studyId, fileKey: uploaded.key, fileName: uploaded.fileName })
  }

  const rows = (report?.rows ?? []).filter((row) => !onlyIssues || row.verdict !== 'READY')

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-text-primary">{t('steps.upload')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('help')}</p>
        <div className="mt-4 flex items-center gap-3">
          <Input
            type="file"
            accept=".csv,.xlsx"
            className="max-w-sm"
            aria-label={t('pick')}
            onChange={(event) => {
              const selected = event.target.files?.[0]
              if (selected) void upload(selected)
            }}
          />
          {busy ? <span className="text-sm text-text-secondary">{t('analysing')}</span> : null}
          {file ? <span className="text-sm text-text-secondary">{file.name}</span> : null}
        </div>
      </section>

      {report ? (
        <>
          <section className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-lg font-semibold text-text-primary">{t('steps.check')}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                { label: t('ready'), value: report.ready, testId: 'cohort-ready' },
                { label: t('warnings'), value: report.warnings, testId: 'cohort-warnings' },
                { label: t('blocked'), value: report.blocked, testId: 'cohort-blocked' },
              ].map((counter) => (
                <div key={counter.label} className="rounded-xl border border-border px-5 py-4">
                  <div className="text-2xl font-light text-text-primary" data-testid={counter.testId}>{counter.value}</div>
                  <div className="mt-1 text-xs text-text-secondary">{counter.label}</div>
                </div>
              ))}
            </div>

            {report.sitesToCreate.length > 0 ? (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {t('sitesToCreate', { codes: report.sitesToCreate.join(', ') })}
              </p>
            ) : null}

            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setOnlyIssues((current) => !current)}>
                {onlyIssues ? t('allRows') : t('onlyIssues')}
              </Button>
            </div>

            <div className="mt-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('line')}</TableHead>
                    <TableHead>{t('patient')}</TableHead>
                    <TableHead>{t('centre')}</TableHead>
                    <TableHead>{t('modality')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('index')}</TableHead>
                    <TableHead>{t('state')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${row.line}-${row.patientId}`}>
                      <TableCell className="text-text-secondary">{row.line}</TableCell>
                      <TableCell className="font-medium text-text-primary">{row.patientId}</TableCell>
                      <TableCell className="text-text-secondary">{row.centreCode}</TableCell>
                      <TableCell className="text-text-secondary">{row.modality}</TableCell>
                      <TableCell className="text-text-secondary">{row.examDate}</TableCell>
                      <TableCell className="text-text-secondary">{row.examIndex}</TableCell>
                      <TableCell>
                        <span className={VERDICT_STYLE[row.verdict]}>{t(`verdict.${row.verdict}`)}</span>
                        {row.issues.length > 0 ? (
                          <span className="block text-xs text-text-secondary">
                            {row.issues.map((issue) => t(`issue.${issue.code}`)).join(' · ')}
                          </span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-6">
            <h2 className="text-lg font-semibold text-text-primary">{t('steps.confirm')}</h2>
            <Button
              disabled={commit.isPending || !file || report.ready + report.warnings === 0}
              onClick={() => {
                if (file) commit.execute({ studyId, fileKey: file.key, fileName: file.name })
              }}
            >
              {t('commit', { count: report.ready + report.warnings })}
            </Button>
          </section>
        </>
      ) : null}
    </div>
  )
}
