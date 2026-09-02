'use client'

import { useTranslations } from 'next-intl'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
      value={value === true ? 'yes' : value === false ? 'no' : ''}
      onValueChange={(next) => onChange(next === 'yes' ? true : next === 'no' ? false : null)}
      aria-label={field.name}
    >
      <ToggleGroupItem value="yes">{t('yes')}</ToggleGroupItem>
      <ToggleGroupItem value="no">{t('no')}</ToggleGroupItem>
    </ToggleGroup>
  )
}
