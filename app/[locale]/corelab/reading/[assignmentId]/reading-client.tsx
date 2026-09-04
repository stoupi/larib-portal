'use client'

import { useMemo, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createDebouncer } from '@/lib/corelab/debounce'
import { readinessOf } from '@/lib/corelab/reading/readiness'
import { FocusShell } from '../../components/crf/focus-shell'
import { SequenceNav } from '../../components/crf/sequence-nav'
import { CrfForm } from '../../components/crf/crf-form'
import { SignatureDialog } from '../../components/signature-dialog'
import { DocumentSlots } from './document-slots'
import { resolveDocumentReturnAction, saveReadingValuesAction, submitReadingAction } from '../../actions-reading'
import type { CrfDefinition, DocumentSlot } from '@/lib/corelab/crf/schema'
import type { FieldChange, FieldValue, ReadingValues } from '@/types/corelab'

type ReadingClientProps = {
  context: {
    assignmentId: string
    studyId: string
    title: string
    subtitle: string
    readOnly: boolean
    crfVersionLabel: string
  }
  definition: CrfDefinition
  exams: Array<{ id: string; label: string }>
  initialValues: ReadingValues
  extras: {
    slots: DocumentSlot[]
    documents: Array<{ id: string; examId: string | null; slotKey: string; fileName: string; status: string }>
    openFlags: number
    documentReturn: { id: string; message: string; slotKeys: string[] } | null
  }
}

export function ReadingClient({ context, definition, exams, initialValues, extras }: ReadingClientProps) {
  const t = useTranslations('corelab.reading')
  const router = useRouter()
  const [values, setValues] = useState<ReadingValues>(initialValues)
  const [examId, setExamId] = useState(exams[0]?.id ?? '')
  const [sequenceId, setSequenceId] = useState(definition[0]?.id ?? '')
  const [signing, setSigning] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = useAction(saveReadingValuesAction, {
    onSuccess: () => setSaving(false),
    onError: () => {
      toast.error(t('error'))
      setSaving(false)
    },
  })

  const submit = useAction(submitReadingAction, {
    onSuccess: () => {
      toast.success(t('submitted'))
      setSigning(false)
      router.push(`/corelab/studies/${context.studyId}/readings`)
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  const resolveReturn = useAction(resolveDocumentReturnAction, {
    onSuccess: ({ data }) => {
      if (data?.resolved) {
        toast.success(t('returned.resent'))
        router.refresh()
        return
      }
      toast.error(t('returned.stillMissing', { slots: (data?.missing ?? []).join(', ') }))
    },
    onError: () => toast.error(t('error')),
  })

  const debouncer = useMemo(
    () => createDebouncer<FieldChange>(800, (batch) => {
      save.execute({ assignmentId: context.assignmentId, changes: batch })
    }),
    [context.assignmentId, save],
  )

  const examValues = values[examId] ?? {}
  const activeSequence = definition.find((sequence) => sequence.id === sequenceId) ?? definition[0]

  const readiness = readinessOf({
    definition,
    exams: exams.map((exam) => ({ id: exam.id, values: values[exam.id] ?? {} })),
    slots: extras.slots,
    documents: extras.documents,
    openFlags: extras.openFlags,
  })

  function handleChange(fieldId: string, value: FieldValue | null) {
    if (context.readOnly || !activeSequence) return
    setValues((current) => {
      const currentExam = current[examId] ?? {}
      const currentSequence = { ...(currentExam[activeSequence.id] ?? {}) }
      if (value === null) delete currentSequence[fieldId]
      else currentSequence[fieldId] = value
      return { ...current, [examId]: { ...currentExam, [activeSequence.id]: currentSequence } }
    })
    setSaving(true)
    debouncer.push({ examId, sequenceId: activeSequence.id, fieldId, value })
  }

  const totals = readiness.exams.reduce(
    (accumulator, exam) => ({ filled: accumulator.filled + exam.filled, required: accumulator.required + exam.required }),
    { filled: 0, required: 0 },
  )

  return (
    <FocusShell
      header={{ backHref: `/corelab/studies/${context.studyId}/readings`, backLabel: t('back'), title: context.title, subtitle: context.subtitle }}
      actions={
        context.readOnly ? (
          <span className="text-sm text-text-secondary">{t('readOnly')}</span>
        ) : (
          <>
            <span className="text-xs text-text-secondary" data-testid="save-state">{saving ? t('saving') : t('saved')}</span>
            {extras.documentReturn ? (
              <Button
                size="sm"
                onClick={() => resolveReturn.execute({ assignmentId: context.assignmentId, returnId: extras.documentReturn!.id })}
              >
                {t('returned.resend')}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  debouncer.flushNow()
                  if (!readiness.canSign) {
                    const missingFields = readiness.exams.reduce((total, exam) => total + exam.missingFields.length, 0)
                    const missingDocuments = readiness.exams.reduce((total, exam) => total + exam.missingDocuments.length, 0)
                    const reason = [
                      missingFields > 0 ? t('missingFields', { count: missingFields }) : '',
                      missingDocuments > 0 ? t('missingDocuments', { count: missingDocuments }) : '',
                    ].filter(Boolean).join(' · ')
                    toast.error(t('signBlocked', { reason }))
                    return
                  }
                  setSigning(true)
                }}
              >
                {t('submit')}
              </Button>
            )}
          </>
        )
      }
      aside={
        <div className="space-y-4">
          {exams.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {exams.map((exam) => (
                <Button key={exam.id} size="sm" variant={exam.id === examId ? 'default' : 'outline'} onClick={() => setExamId(exam.id)}>
                  {exam.label}
                </Button>
              ))}
            </div>
          ) : null}
          <DocumentSlots
            context={{ assignmentId: context.assignmentId, examId, readOnly: context.readOnly }}
            slots={extras.slots}
            documents={extras.documents}
          />
          <SequenceNav sequences={definition} values={examValues} activeId={activeSequence?.id ?? ''} onSelect={setSequenceId} />
        </div>
      }
    >
      {extras.documentReturn ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">{t('returned.banner')}</p>
          <p className="mt-1 text-sm text-amber-800">{t('returned.message', { message: extras.documentReturn.message })}</p>
        </div>
      ) : null}

      {activeSequence ? (
        <CrfForm
          sequence={activeSequence}
          values={examValues[activeSequence.id] ?? {}}
          readOnly={context.readOnly}
          onChange={handleChange}
        />
      ) : null}

      <SignatureDialog
        open={signing}
        onOpenChange={setSigning}
        title={t('signTitle')}
        summary={
          <>
            <span className="block">{t('signSummary', { filled: totals.filled, required: totals.required, flags: readiness.openFlags })}</span>
            <span className="block">{t('signVersion', { version: context.crfVersionLabel })}</span>
          </>
        }
        onConfirm={({ password, reason }) => submit.execute({ assignmentId: context.assignmentId, password, reason })}
      />
    </FocusShell>
  )
}
