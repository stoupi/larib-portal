'use client'

import { useTranslations } from 'next-intl'
import { SingleSelect } from '@/components/ui/single-select'
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
    <SingleSelect
      className="w-64"
      disabled={readOnly}
      placeholder={t('choose')}
      options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
      value={typeof value === 'string' ? value : ''}
      onChange={(next) => onChange(next === '' ? null : next)}
    />
  )
}
