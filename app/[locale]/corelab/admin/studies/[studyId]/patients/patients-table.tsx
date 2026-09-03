'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SingleSelect } from '@/components/ui/single-select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { saveDraftAssignmentsAction, validateAssignmentsAction } from '../../../actions-assignment'
import { canValidateDraft } from '@/lib/corelab/assignment/rules'
import type { CohortPatient } from '@/lib/services/corelab/cohort'

type Person = { value: string; label: string }
type Draft = { readingMode: 'SINGLE' | 'DOUBLE'; reader1: string; reader2: string; reviewer: string }

type PatientsTableProps = {
  studyId: string
  patients: CohortPatient[]
  readers: Person[]
  reviewers: Person[]
}

function initialDraft(patient: CohortPatient): Draft {
  const find = (role: string) => patient.assignments.find((assignment) => assignment.role === role)?.user.id ?? ''
  return {
    readingMode: patient.readingMode ?? 'SINGLE',
    reader1: find('READER_1'),
    reader2: find('READER_2'),
    reviewer: find('REVIEWER'),
  }
}

export function PatientsTable({ studyId, patients, readers, reviewers }: PatientsTableProps) {
  const t = useTranslations('corelab.patients')
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, Draft>>(
    () => Object.fromEntries(patients.map((patient) => [patient.id, initialDraft(patient)])),
  )
  const [validating, setValidating] = useState(false)
  const [dueDates, setDueDates] = useState<Record<string, string>>({})

  const save = useAction(saveDraftAssignmentsAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  const validate = useAction(validateAssignmentsAction, {
    onSuccess: ({ data }) => {
      toast.success(t('sent', { readers: data?.readers ?? 0, patients: data?.patients ?? 0 }))
      setValidating(false)
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  function update(patientId: string, patch: Partial<Draft>) {
    const next = { ...drafts[patientId], ...patch }
    setDrafts((current) => ({ ...current, [patientId]: next }))
    save.execute({
      studyId,
      drafts: [{
        patientId,
        readingMode: next.readingMode,
        reader1: next.reader1 || null,
        reader2: next.reader2 || null,
        reviewer: next.reviewer || null,
      }],
    })
  }

  const pendingReaders = [...new Set(
    patients
      .filter((patient) => patient.status === 'UNASSIGNED')
      .flatMap((patient) => [drafts[patient.id]?.reader1, drafts[patient.id]?.reader2])
      .filter((userId): userId is string => Boolean(userId)),
  )]

  const anyValidDraft = patients.some(
    (patient) => patient.status === 'UNASSIGNED' && drafts[patient.id] && canValidateDraft({
      readingMode: drafts[patient.id].readingMode,
      reader1: drafts[patient.id].reader1 || undefined,
      reader2: drafts[patient.id].reader2 || undefined,
      reviewer: drafts[patient.id].reviewer || undefined,
    }),
  )

  return (
    <>
      <div className="flex justify-end">
        <Button disabled={!anyValidDraft} onClick={() => setValidating(true)}>{t('validate')}</Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('patient')}</TableHead>
              <TableHead>{t('centre')}</TableHead>
              <TableHead>{t('exams')}</TableHead>
              <TableHead>{t('mode')}</TableHead>
              <TableHead>{t('reader1')}</TableHead>
              <TableHead>{t('reader2')}</TableHead>
              <TableHead>{t('reviewer')}</TableHead>
              <TableHead>{t('status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => {
              const draft = drafts[patient.id]
              const locked = patient.status !== 'UNASSIGNED'
              const taken = [draft?.reader1, draft?.reader2].filter(Boolean)
              return (
                <TableRow key={patient.id} data-testid={`patient-${patient.code}`}>
                  <TableCell className="font-medium text-text-primary">{patient.code}</TableCell>
                  <TableCell className="text-text-secondary">{patient.site.code}</TableCell>
                  <TableCell className="text-text-secondary">{patient.exams.length}</TableCell>
                  <TableCell>
                    <SingleSelect
                      className="w-28"
                      disabled={locked}
                      options={[{ value: 'SINGLE', label: t('single') }, { value: 'DOUBLE', label: t('double') }]}
                      value={draft?.readingMode ?? 'SINGLE'}
                      onChange={(value) => update(patient.id, { readingMode: value === 'DOUBLE' ? 'DOUBLE' : 'SINGLE' })}
                    />
                  </TableCell>
                  <TableCell>
                    <SingleSelect
                      className="w-40"
                      disabled={locked}
                      placeholder={t('none')}
                      options={readers.filter((person) => person.value !== draft?.reader2)}
                      value={draft?.reader1 ?? ''}
                      onChange={(value) => update(patient.id, { reader1: value })}
                    />
                  </TableCell>
                  <TableCell>
                    {draft?.readingMode === 'DOUBLE' ? (
                      <SingleSelect
                        className="w-40"
                        disabled={locked}
                        placeholder={t('none')}
                        options={readers.filter((person) => person.value !== draft?.reader1)}
                        value={draft?.reader2 ?? ''}
                        onChange={(value) => update(patient.id, { reader2: value })}
                      />
                    ) : (
                      <span className="text-text-secondary">{t('none')}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SingleSelect
                      className="w-40"
                      disabled={locked}
                      placeholder={t('none')}
                      options={reviewers.filter((person) => !taken.includes(person.value))}
                      value={draft?.reviewer ?? ''}
                      onChange={(value) => update(patient.id, { reviewer: value })}
                    />
                    {patient.reviewerMissing ? (
                      <span className="ml-2 rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] text-red-700">
                        {t('missing')}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {locked ? t(`statuses.${patient.status}`) : (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">
                        {draft?.reader1 ? t('draft') : t(`statuses.${patient.status}`)}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={validating} onOpenChange={setValidating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('validateTitle')}</DialogTitle>
            <DialogDescription>{t('validateHelp')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {pendingReaders.map((userId) => (
              <div key={userId} className="space-y-1">
                <Label htmlFor={`due-${userId}`}>
                  {readers.find((person) => person.value === userId)?.label ?? userId}
                </Label>
                <Input
                  id={`due-${userId}`}
                  type="date"
                  value={dueDates[userId] ?? ''}
                  onChange={(event) => setDueDates((current) => ({ ...current, [userId]: event.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              disabled={validate.isPending || pendingReaders.some((userId) => !dueDates[userId])}
              onClick={() => validate.execute({ studyId, dueDates })}
            >
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
