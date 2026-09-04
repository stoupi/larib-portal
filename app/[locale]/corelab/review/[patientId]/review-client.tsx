'use client'

import { useMemo, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { SingleSelect } from '@/components/ui/single-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FocusShell } from '../../components/crf/focus-shell'
import { SignatureDialog } from '../../components/signature-dialog'
import { requestReworkAction, saveDecisionsAction, signReviewAction } from '../../actions-review'
import type { DecisionType } from '@/lib/corelab/review/compare'

export type ComparedRow = {
  key: string
  examId: string
  sequenceId: string
  sequenceName: string
  fieldId: string
  fieldName: string
  fieldType: string
  options: string[]
  unit: string | null
  r1: unknown
  r2: unknown
  level: 'OK' | 'MINOR' | 'MAJOR' | 'NOT_COMPARED'
  average: number | null
  discordantSegments: number | null
}

type ReviewClientProps = {
  context: { patientId: string; studyId: string; title: string; subtitle: string; reworkPending: boolean }
  rows: ComparedRow[]
  initialDecisions: Record<string, { decision: DecisionType; customValue: unknown }>
  readers: Array<{ assignmentId: string; name: string }>
  sequences: Array<{ id: string; name: string }>
}

const LEVEL_STYLE: Record<string, string> = {
  OK: 'text-emerald-700',
  MINOR: 'text-amber-700',
  MAJOR: 'text-red-600',
  NOT_COMPARED: 'text-text-secondary',
}

function display(value: unknown): string {
  if (value === null || value === undefined || typeof value === 'object') return '—'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export function ReviewClient({ context, rows, initialDecisions, readers, sequences }: ReviewClientProps) {
  const t = useTranslations('corelab.review')
  const router = useRouter()
  const [decisions, setDecisions] = useState(initialDecisions)
  const [onlyDiscordances, setOnlyDiscordances] = useState(true)
  const [signing, setSigning] = useState(false)
  const [reworking, setReworking] = useState(false)
  const [reworkSelection, setReworkSelection] = useState<Record<string, boolean>>({})
  const [reworkComments, setReworkComments] = useState<Record<string, string>>({})

  const save = useAction(saveDecisionsAction, {
    onSuccess: () => router.refresh(),
    onError: () => toast.error(t('error')),
  })

  const sign = useAction(signReviewAction, {
    onSuccess: () => {
      toast.success(t('signed'))
      setSigning(false)
      router.push(`/corelab/studies/${context.studyId}/reviews`)
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  const rework = useAction(requestReworkAction, {
    onSuccess: () => {
      toast.success(t('reworkSent'))
      setReworking(false)
      router.refresh()
    },
    onError: ({ error }) => toast.error(error.serverError === 'COMMENT_REQUIRED' ? t('reworkHelp') : t('error')),
  })

  const pending = useMemo(
    () => rows.filter((row) => (row.level === 'MINOR' || row.level === 'MAJOR') && !decisions[row.key]),
    [rows, decisions],
  )
  const visible = onlyDiscordances ? rows.filter((row) => row.level === 'MINOR' || row.level === 'MAJOR') : rows

  function decide(row: ComparedRow, decision: DecisionType, customValue?: unknown) {
    setDecisions((current) => ({ ...current, [row.key]: { decision, customValue: customValue ?? null } }))
    save.execute({
      patientId: context.patientId,
      decisions: [{ examId: row.examId, sequenceId: row.sequenceId, fieldId: row.fieldId, decision, customValue }],
    })
  }

  function finalValueOf(row: ComparedRow): string {
    const decision = decisions[row.key]
    if (!decision) return '—'
    if (decision.decision === 'CUSTOM') return display(decision.customValue)
    if (decision.decision === 'AVERAGE') return display(row.average ?? row.r1)
    return display(decision.decision === 'R2' ? row.r2 : row.r1)
  }

  return (
    <FocusShell
      header={{
        backHref: `/corelab/studies/${context.studyId}/reviews`,
        backLabel: t('back'),
        title: context.title,
        subtitle: context.subtitle,
      }}
      actions={
        <>
          <span className="text-xs text-text-secondary" data-testid="pending-count">
            {t('pending', { count: pending.length })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setReworking(true)}>{t('requestRework')}</Button>
          <Button
            size="sm"
            onClick={() => {
              if (pending.length > 0) {
                toast.error(t('signBlocked', { count: pending.length }))
                return
              }
              setSigning(true)
            }}
          >
            {t('sign')}
          </Button>
        </>
      }
      aside={
        <nav className="space-y-1">
          {sequences.map((sequence) => {
            const discordances = rows.filter(
              (row) => row.sequenceId === sequence.id && (row.level === 'MINOR' || row.level === 'MAJOR'),
            ).length
            return (
              <div key={sequence.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
                <span className="text-text-primary">{sequence.name}</span>
                <span className={discordances > 0 ? 'text-amber-700' : 'text-text-secondary'}>{discordances}</span>
              </div>
            )
          })}
        </nav>
      }
    >
      {context.reworkPending ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t('reworkPending')}</p>
      ) : null}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setOnlyDiscordances((current) => !current)}>
          {onlyDiscordances ? t('allFields') : t('onlyDiscordances')}
        </Button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('variable')}</TableHead>
              <TableHead>{t('reader1')}</TableHead>
              <TableHead>{t('reader2')}</TableHead>
              <TableHead>{t('level')}</TableHead>
              <TableHead>{t('decision')}</TableHead>
              <TableHead>{t('finalValue')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.key} data-testid={`compared-${row.fieldId}`}>
                <TableCell>
                  <span className="font-medium text-text-primary">{row.fieldName}</span>
                  <span className="block text-xs text-text-secondary">{row.sequenceName}</span>
                </TableCell>
                <TableCell className="text-text-secondary">{display(row.r1)}</TableCell>
                <TableCell className="text-text-secondary">{display(row.r2)}</TableCell>
                <TableCell>
                  <span className={LEVEL_STYLE[row.level]} data-testid={`level-${row.fieldId}`}>{t(`levels.${row.level}`)}</span>
                  {row.discordantSegments !== null ? (
                    <span className="block text-xs text-text-secondary">
                      {t('segmentsDiscordant', { count: row.discordantSegments })}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <SingleSelect
                      className="w-32"
                      placeholder={t('decision')}
                      options={(['R1', 'R2', 'AVERAGE', 'CUSTOM'] as const).map((value) => ({ value, label: t(`decisions.${value}`) }))}
                      value={decisions[row.key]?.decision ?? ''}
                      onChange={(value) => decide(row, value as DecisionType)}
                    />
                    {decisions[row.key]?.decision === 'CUSTOM' ? (
                      row.fieldType === 'boolean' ? (
                        <SingleSelect
                          className="w-28"
                          placeholder={t('customValue')}
                          options={[{ value: 'true', label: 'true' }, { value: 'false', label: 'false' }]}
                          value={decisions[row.key]?.customValue === true ? 'true' : decisions[row.key]?.customValue === false ? 'false' : ''}
                          onChange={(value) => decide(row, 'CUSTOM', value === 'true')}
                        />
                      ) : row.fieldType === 'categorical' ? (
                        <SingleSelect
                          className="w-32"
                          placeholder={t('customValue')}
                          options={row.options.map((option) => ({ value: option, label: option }))}
                          value={typeof decisions[row.key]?.customValue === 'string' ? String(decisions[row.key]?.customValue) : ''}
                          onChange={(value) => decide(row, 'CUSTOM', value)}
                        />
                      ) : (
                        <Input
                          className="w-24"
                          type={row.fieldType === 'numeric' ? 'number' : 'text'}
                          aria-label={t('customValue')}
                          defaultValue={String(decisions[row.key]?.customValue ?? '')}
                          onBlur={(event) => {
                            const raw = event.target.value
                            if (raw.trim() === '') return
                            decide(row, 'CUSTOM', row.fieldType === 'numeric' ? Number(raw) : raw)
                          }}
                        />
                      )
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-text-primary" data-testid={`final-${row.fieldId}`}>{finalValueOf(row)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={reworking} onOpenChange={setReworking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reworkTitle')}</DialogTitle>
            <DialogDescription>{t('reworkHelp')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-4 overflow-y-auto">
            {readers.map((reader) => (
              <div key={reader.assignmentId} className="space-y-2">
                <p className="text-sm font-medium text-text-primary">{reader.name}</p>
                {sequences.map((sequence) => {
                  const key = `${reader.assignmentId}.${sequence.id}`
                  return (
                    <div key={key} className="space-y-1 rounded-lg border border-border p-2">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={reworkSelection[key] ?? false}
                          onCheckedChange={(next) => setReworkSelection((current) => ({ ...current, [key]: next === true }))}
                        />
                        {sequence.name}
                      </label>
                      {reworkSelection[key] ? (
                        <div className="space-y-1">
                          <Label htmlFor={`comment-${key}`}>{t('reworkComment')}</Label>
                          <Input
                            id={`comment-${key}`}
                            value={reworkComments[key] ?? ''}
                            onChange={(event) => setReworkComments((current) => ({ ...current, [key]: event.target.value }))}
                          />
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              disabled={rework.isPending}
              onClick={() => {
                const items = Object.entries(reworkSelection)
                  .filter(([, selected]) => selected)
                  .map(([key]) => {
                    const [readerAssignmentId, sequenceId] = key.split('.')
                    return {
                      readerAssignmentId,
                      sequenceId,
                      fieldIds: rows.filter((row) => row.sequenceId === sequenceId).map((row) => row.fieldId),
                    }
                  })
                if (items.length === 0) return
                rework.execute({ patientId: context.patientId, items, comments: reworkComments })
              }}
            >
              {t('reworkSend')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignatureDialog
        open={signing}
        onOpenChange={setSigning}
        title={t('signTitle')}
        summary={t('signSummary', {
          decided: Object.keys(decisions).length,
          custom: Object.values(decisions).filter((decision) => decision.decision === 'CUSTOM').length,
        })}
        onConfirm={({ password, reason }) => sign.execute({ patientId: context.patientId, password, reason })}
      />
    </FocusShell>
  )
}
