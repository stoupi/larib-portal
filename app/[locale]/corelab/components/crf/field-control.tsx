'use client'

import { FieldInputNumeric } from './field-input-numeric'
import { FieldInputBoolean } from './field-input-boolean'
import { FieldInputCategorical } from './field-input-categorical'
import { FieldInputText } from './field-input-text'
import { FieldInputSeries } from './field-input-series'
import { BullsEye } from './bulls-eye'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'
import type { SegmentValues } from '@/types/corelab'

type FieldControlProps = {
  field: FieldDefinition
  value: unknown
  onChange: (value: unknown) => void
  readOnly: boolean
}

export function FieldControl({ field, value, onChange, readOnly }: FieldControlProps) {
  if (field.type === 'numeric') return <FieldInputNumeric field={field} value={value} onChange={onChange} readOnly={readOnly} />
  if (field.type === 'boolean') return <FieldInputBoolean field={field} value={value} onChange={onChange} readOnly={readOnly} />
  if (field.type === 'categorical') return <FieldInputCategorical field={field} value={value} onChange={onChange} readOnly={readOnly} />
  if (field.type === 'text') return <FieldInputText field={field} value={value} onChange={onChange} readOnly={readOnly} />
  if (field.type === 'series_availability') return <FieldInputSeries field={field} value={value} onChange={onChange} readOnly={readOnly} />
  return (
    <BullsEye
      field={field}
      value={(value ?? undefined) as SegmentValues | undefined}
      onChange={onChange}
      readOnly={readOnly}
    />
  )
}
