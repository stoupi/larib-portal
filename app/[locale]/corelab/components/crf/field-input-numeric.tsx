'use client'

import { Input } from '@/components/ui/input'
import { isOutOfBounds } from '@/lib/corelab/crf/values'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

type NumericInputProps = {
  field: FieldDefinition
  value: unknown
  onChange: (value: number | null) => void
  readOnly: boolean
}

export function FieldInputNumeric({ field, value, onChange, readOnly }: NumericInputProps) {
  const outOfBounds = isOutOfBounds(field, value)
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        step="any"
        min={field.min}
        max={field.max}
        disabled={readOnly}
        aria-label={field.name}
        className={`w-32 ${outOfBounds ? 'border-red-400 text-red-700' : ''}`}
        value={typeof value === 'number' && Number.isFinite(value) ? String(value) : ''}
        onChange={(event) => {
          const raw = event.target.value
          onChange(raw === '' ? null : Number(raw))
        }}
      />
      {field.unit ? <span className="text-sm text-text-secondary">{field.unit}</span> : null}
    </div>
  )
}
