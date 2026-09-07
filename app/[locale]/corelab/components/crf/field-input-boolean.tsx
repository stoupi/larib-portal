'use client'

import { useTranslations } from 'next-intl'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { ToggleChip } from './toggle-chip'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

type BooleanInputProps = {
  field: FieldDefinition
  value: unknown
  onChange: (value: boolean | null) => void
  readOnly: boolean
}

export function FieldInputBoolean({ field, value, onChange, readOnly }: BooleanInputProps) {
  const t = useTranslations('corelab.form')
  return (
    <ToggleGroup
      type="single"
      disabled={readOnly}
      className="inline-flex gap-1.5"
      value={value === true ? 'yes' : value === false ? 'no' : ''}
      onValueChange={(next) => onChange(next === 'yes' ? true : next === 'no' ? false : null)}
      aria-label={field.name}
    >
      <ToggleChip value="yes">{t('yes')}</ToggleChip>
      <ToggleChip value="no">{t('no')}</ToggleChip>
    </ToggleGroup>
  )
}
