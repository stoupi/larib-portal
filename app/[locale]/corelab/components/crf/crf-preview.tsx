'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { defaultSequenceValues } from '@/lib/corelab/crf/values'
import { FocusShell } from './focus-shell'
import { SequenceNav } from './sequence-nav'
import { CrfForm } from './crf-form'
import type { CrfDefinition } from '@/lib/corelab/crf/schema'
import type { ExamValues, FieldValue } from '@/types/corelab'

type CrfPreviewProps = {
  definition: CrfDefinition
  study: { id: string; code: string; name: string }
}

function initialValues(definition: CrfDefinition): ExamValues {
  return Object.fromEntries(definition.map((sequence) => [sequence.id, defaultSequenceValues(sequence)]))
}

export function CrfPreview({ definition, study }: CrfPreviewProps) {
  const t = useTranslations('corelab.form.preview')
  const [values, setValues] = useState<ExamValues>(() => initialValues(definition))
  const [activeId, setActiveId] = useState(definition[0]?.id ?? '')
  const [changeCount, setChangeCount] = useState(0)

  const activeSequence = definition.find((sequence) => sequence.id === activeId) ?? definition[0]

  function handleChange(sequenceId: string, fieldId: string, value: FieldValue | null) {
    setChangeCount((count) => count + 1)
    setValues((current) => {
      const sequenceValues = { ...(current[sequenceId] ?? {}) }
      if (value === null) delete sequenceValues[fieldId]
      else sequenceValues[fieldId] = value
      return { ...current, [sequenceId]: sequenceValues }
    })
  }

  return (
    <FocusShell
      header={{
        backHref: `/corelab/admin/studies/${study.id}`,
        backLabel: t('back'),
        title: `${study.code} · ${t('title')}`,
        subtitle: t('subtitle'),
      }}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setValues(initialValues(definition))
            setChangeCount(0)
          }}
        >
          {t('reset')}
        </Button>
      }
      aside={<SequenceNav sequences={definition} values={values} activeId={activeSequence?.id ?? ''} onSelect={setActiveId} />}
    >
      {activeSequence ? (
        <CrfForm
          sequence={activeSequence}
          values={values[activeSequence.id] ?? {}}
          readOnly={false}
          onChange={(fieldId, value) => handleChange(activeSequence.id, fieldId, value)}
        />
      ) : null}
      <p className="mt-6 text-xs text-text-secondary" data-testid="change-count">
        {t('changes', { count: changeCount })}
      </p>
    </FocusShell>
  )
}
