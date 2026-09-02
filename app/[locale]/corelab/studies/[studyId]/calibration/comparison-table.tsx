'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ComparisonRow } from '@/lib/corelab/calibration/comparison'

function display(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return '—'
  return String(value)
}

export function ComparisonTable({ rows, comments }: { rows: ComparisonRow[]; comments: Record<string, string> }) {
  const t = useTranslations('corelab.calibration.reader_')
  const [onlyGaps, setOnlyGaps] = useState(false)

  const visible = onlyGaps
    ? rows.filter((row) => !row.verdict.withinTolerance || (row.discordantSegments ?? 0) > 0)
    : rows

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setOnlyGaps((current) => !current)}>
          {onlyGaps ? t('allFields') : t('onlyGaps')}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('variable')}</TableHead>
              <TableHead>{t('mine')}</TableHead>
              <TableHead>{t('gold')}</TableHead>
              <TableHead>{t('gap')}</TableHead>
              <TableHead>{t('verdict')}</TableHead>
              <TableHead>{t('comment')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.key}>
                <TableCell>
                  <span className="font-medium text-text-primary">{row.fieldName}</span>
                  <span className="block text-xs text-text-secondary">{row.sequenceName}</span>
                </TableCell>
                <TableCell className="text-text-secondary">{display(row.readerValue)}</TableCell>
                <TableCell className="text-text-secondary">{display(row.goldValue)}</TableCell>
                <TableCell className="text-text-secondary">
                  {row.discordantSegments !== null
                    ? t('segmentsDiscordant', { count: row.discordantSegments })
                    : row.verdict.delta === null
                      ? '—'
                      : row.verdict.delta.toFixed(1)}
                </TableCell>
                <TableCell>
                  <span className={row.verdict.rule === 'not_compared' ? 'text-text-secondary' : row.verdict.withinTolerance ? 'text-emerald-700' : 'text-red-600'}>
                    {row.verdict.rule === 'not_compared' ? t('notCompared') : row.verdict.withinTolerance ? t('within') : t('outside')}
                  </span>
                </TableCell>
                <TableCell className="text-text-secondary">{comments[row.key] ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
