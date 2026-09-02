'use client'

import { useTranslations } from 'next-intl'
import { isFieldVisible, sequenceCompletion } from '@/lib/corelab/crf/values'
import { FieldRow } from './field-row'
import type { SequenceDefinition } from '@/lib/corelab/crf/schema'
import type { FieldValue, SequenceValues } from '@/types/corelab'

type CrfFormProps = {
  sequence: SequenceDefinition
  values: SequenceValues
  onChange: (fieldId: string, value: FieldValue | null) => void
  readOnly: boolean
}

export function CrfForm({ sequence, values, onChange, readOnly }: CrfFormProps) {
  const t = useTranslations('corelab.form')
  const completion = sequenceCompletion(sequence, values)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-text-primary">{sequence.name}</h2>
        <span className="text-sm text-text-secondary" data-testid={`completion-${sequence.id}`}>
          {t('completion', { filled: completion.filled, required: completion.required })}
        </span>
      </div>

      {sequence.sections.map((section) => {
        const fields = section.fields.filter((field) => isFieldVisible(field, values))
        if (fields.length === 0) return null
        return (
          <section key={section.id} className="rounded-2xl border border-border bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{section.name}</h3>
            <div className="mt-2">
              {fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  value={values[field.id]}
                  readOnly={readOnly}
                  onChange={(value) => onChange(field.id, value)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
