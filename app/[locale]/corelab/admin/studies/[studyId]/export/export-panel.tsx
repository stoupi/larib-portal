'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { exportDownloadUrlAction, exportStudyAction, previewExportAction } from '../../../actions-export'

type Kind = 'READINGS_LONG' | 'READINGS_WIDE' | 'REVIEW_DECISIONS' | 'CALIBRATION' | 'FULL_ARCHIVE'
const ALL: Kind[] = ['READINGS_LONG', 'READINGS_WIDE', 'REVIEW_DECISIONS', 'CALIBRATION', 'FULL_ARCHIVE']
const PREVIEWABLE: Kind[] = ['READINGS_LONG', 'READINGS_WIDE', 'REVIEW_DECISIONS', 'CALIBRATION']

type ExportPanelProps = {
  studyId: string
  exports: Array<{ id: string; kind: string; fileName: string; rowCount: number; createdAt: Date }>
}

export function ExportPanel({ studyId, exports }: ExportPanelProps) {
  const t = useTranslations('corelab.export')
  const router = useRouter()
  const [preview, setPreview] = useState<{ headers: string[]; rows: Array<Record<string, unknown>> } | null>(null)

  const previewAction = useAction(previewExportAction, {
    onSuccess: ({ data }) => setPreview(data ? { headers: data.headers, rows: data.rows } : null),
    onError: () => toast.error(t('error')),
  })

  const generate = useAction(exportStudyAction, {
    onSuccess: ({ data }) => {
      if (!data) {
        toast.error(t('noData'))
        return
      }
      toast.success(t('generated', { rows: data.rowCount }))
      window.open(data.url, '_blank')
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  const download = useAction(exportDownloadUrlAction, {
    onSuccess: ({ data }) => {
      if (data?.url) window.open(data.url, '_blank')
    },
    onError: () => toast.error(t('error')),
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {ALL.map((kind) => {
          const previewable = PREVIEWABLE.includes(kind)
          return (
            <div key={kind} className="rounded-2xl border border-border bg-white p-5" data-testid={`export-${kind}`}>
              <h3 className="text-base font-semibold text-text-primary">{t(`kinds.${kind}`)}</h3>
              <p className="mt-1 text-sm text-text-secondary">{t(`kindHelp.${kind}`)}</p>
              <div className="mt-4 flex gap-2">
                {previewable ? (
                  <Button variant="outline" size="sm" onClick={() => previewAction.execute({ studyId, kind })}>
                    {t('preview')}
                  </Button>
                ) : null}
                <Button size="sm" disabled={generate.isPending} onClick={() => generate.execute({ studyId, kind })}>
                  {t('generate')}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {preview ? (
        <section className="overflow-x-auto rounded-2xl border border-border bg-white p-6" data-testid="export-preview">
          <h3 className="text-base font-semibold text-text-primary">{t('preview')}</h3>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                {preview.headers.map((header) => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.rows.map((row, index) => (
                <TableRow key={index}>
                  {preview.headers.map((header) => (
                    <TableCell key={header} className="text-text-secondary">
                      {row[header] === null || row[header] === undefined ? '—' : String(row[header])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary">{t('recent')}</h3>
        {exports.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">{t('noExport')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {exports.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-text-primary">{entry.fileName}</span>
                <span className="text-text-secondary">{t('rows', { count: entry.rowCount })}</span>
                <Button variant="ghost" size="sm" onClick={() => download.execute({ studyId, exportId: entry.id })}>
                  {t('download')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
