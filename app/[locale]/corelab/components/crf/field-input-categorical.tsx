'use client'

import { useTranslations } from 'next-intl'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { ToggleChip } from './toggle-chip'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

type CategoricalInputProps = {
  field: FieldDefinition
  value: unknown
  onChange: (value: string | null) => void
  readOnly: boolean
}

export function FieldInputCategorical({ field, value, onChange, readOnly }: CategoricalInputProps) {
  const t = useTranslations('corelab.form')
  return (
    <ToggleGroup
      type="single"
      disabled={readOnly}
      className="flex flex-wrap justify-start gap-1.5"
      value={typeof value === 'string' ? value : ''}
      onValueChange={(next) => onChange(next === '' ? null : next)}
      aria-label={field.name}
    >
      {(field.options ?? []).map((option) => (
        <ToggleChip key={option} value={option} size="sm">{option}</ToggleChip>
      ))}
      {(field.options ?? []).length === 0 ? <span className="text-sm text-text-muted">{t('choose')}</span> : null}
    </ToggleGroup>
  )
}
