'use client'

import { Textarea } from '@/components/ui/textarea'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

type TextInputProps = {
  field: FieldDefinition
  value: unknown
  onChange: (value: string | null) => void
  readOnly: boolean
}

export function FieldInputText({ field, value, onChange, readOnly }: TextInputProps) {
  return (
    <Textarea
      rows={2}
      disabled={readOnly}
      aria-label={field.name}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
    />
  )
}
