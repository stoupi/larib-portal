'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createDebouncer } from '@/lib/corelab/debounce'
import { defaultSequenceValues, sequenceCompletion } from '@/lib/corelab/crf/values'
import { FocusShell } from './focus-shell'
import { SequenceNav } from './sequence-nav'
import { CrfForm } from './crf-form'
import { SignatureDialog } from '../signature-dialog'
import type { CrfDefinition } from '@/lib/corelab/crf/schema'
import type { ExamValues, FieldValue, ReadingValues } from '@/types/corelab'

export type CalibrationEditorProps = {
  context: {
    studyId: string
    caseCode: string
    backHref: string
    title: string
    subtitle: string
    hideSegments: boolean
    readOnly: boolean
  }
  definition: CrfDefinition
  exams: Array<{ id: string; label: string }>
  initialValues: ReadingValues
  handlers: {
    onSave: (examId: string, values: ExamValues) => void
    onSign: (input: { password: string; reason: string }) => void
    signLabel: string
  }
}

function withCrfDefaults(definition: CrfDefinition, exams: Array<{ id: string }>, values: ReadingValues): ReadingValues {
  const seeded: ReadingValues = { ...values }
  for (const exam of exams) {
    const examValues = { ...(seeded[exam.id] ?? {}) }
    for (const sequence of definition) {
      if (examValues[sequence.id]) continue
      const defaults = defaultSequenceValues(sequence)
      if (Object.keys(defaults).length > 0) examValues[sequence.id] = defaults
    }
    seeded[exam.id] = examValues
  }
  return seeded
}

export function CalibrationEditor({ context, definition, exams, initialValues, handlers }: CalibrationEditorProps) {
  const t = useTranslations('corelab.calibration')
  const [values, setValues] = useState<ReadingValues>(() => withCrfDefaults(definition, exams, initialValues))
  const [examId, setExamId] = useState(exams[0]?.id ?? '')
  const [sequenceId, setSequenceId] = useState(definition[0]?.id ?? '')
  const [signing, setSigning] = useState(false)
  const [saving, setSaving] = useState(false)

  const sequences = useMemo(
    () => (context.hideSegments
      ? definition.map((sequence) => ({
          ...sequence,
          sections: sequence.sections
            .map((section) => ({ ...section, fields: section.fields.filter((field) => !field.type.startsWith('segment_')) }))
            .filter((section) => section.fields.length > 0),
        })).filter((sequence) => sequence.sections.length > 0)
      : definition),
    [definition, context.hideSegments],
  )

  const debouncer = useMemo(
    () => createDebouncer<{ examId: string; values: ExamValues }>(800, (batch) => {
      const last = batch[batch.length - 1]
      if (!last) return
      handlers.onSave(last.examId, last.values)
      setSaving(false)
    }),
    [handlers],
  )

  const examValues = values[examId] ?? {}
  const activeSequence = sequences.find((sequence) => sequence.id === sequenceId) ?? sequences[0]

  function handleChange(fieldId: string, value: FieldValue | null) {
    if (context.readOnly) return
    setValues((current) => {
      const currentExam = current[examId] ?? {}
      const currentSequence = { ...(currentExam[activeSequence?.id ?? ''] ?? {}) }
      if (value === null) delete currentSequence[fieldId]
      else currentSequence[fieldId] = value
      const nextExam = { ...currentExam, [activeSequence?.id ?? '']: currentSequence }
      setSaving(true)
      debouncer.push({ examId, values: nextExam })
      return { ...current, [examId]: nextExam }
    })
  }

  function missingRequired(): string[] {
    return sequences.flatMap((sequence) => sequenceCompletion(sequence, examValues[sequence.id] ?? {}).missing)
  }

  return (
    <FocusShell
      header={{
        backHref: context.backHref,
        backLabel: t('backToCalibration'),
        title: context.title,
        subtitle: context.subtitle,
      }}
      actions={
        context.readOnly ? (
          <span className="text-sm text-text-secondary">{t('readOnly')}</span>
        ) : (
          <>
            <span className="text-xs text-text-secondary" data-testid="save-state">
              {saving ? t('saving') : t('saved')}
            </span>
            <Button
              size="sm"
              onClick={() => {
                debouncer.flushNow()
                const missing = missingRequired()
                if (missing.length > 0) {
                  toast.error(t('missingRequired', { fields: missing.slice(0, 5).join(', ') }))
                  return
                }
                setSigning(true)
              }}
            >
              {handlers.signLabel}
            </Button>
          </>
        )
      }
      aside={
        <div className="space-y-4">
          {exams.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {exams.map((exam) => (
                <Button
                  key={exam.id}
                  size="sm"
                  variant={exam.id === examId ? 'default' : 'outline'}
                  onClick={() => setExamId(exam.id)}
                >
                  {exam.label}
                </Button>
              ))}
            </div>
          ) : null}
          <SequenceNav sequences={sequences} values={examValues} activeId={activeSequence?.id ?? ''} onSelect={setSequenceId} />
        </div>
      }
    >
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
        title={handlers.signLabel}
        summary={t('submitSummary', {
          exams: exams.length,
          filled: sequences.reduce((total, sequence) => total + sequenceCompletion(sequence, examValues[sequence.id] ?? {}).filled, 0),
          required: sequences.reduce((total, sequence) => total + sequenceCompletion(sequence, examValues[sequence.id] ?? {}).required, 0),
        })}
        onConfirm={(input) => {
          handlers.onSign(input)
          setSigning(false)
        }}
      />
    </FocusShell>
  )
}
