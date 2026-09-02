'use client'

import { useTranslations } from 'next-intl'
import { MultiSelect } from '@/components/ui/multiselect'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

type SeriesInputProps = {
  field: FieldDefinition
  value: unknown
  onChange: (value: string[] | null) => void
  readOnly: boolean
}

export function FieldInputSeries({ field, value, onChange, readOnly }: SeriesInputProps) {
  const t = useTranslations('corelab.form')
  const selected = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
  return (
    <MultiSelect
      className="w-72"
      disabled={readOnly}
      placeholder={t('choose')}
      options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
      defaultValue={selected}
      onValueChange={(next) => onChange(next.length === 0 ? null : next)}
    />
  )
}
