'use client'

import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { ToggleChip } from './toggle-chip'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

type SeriesInputProps = {
  field: FieldDefinition
  value: unknown
  onChange: (value: string[] | null) => void
  readOnly: boolean
}

export function FieldInputSeries({ field, value, onChange, readOnly }: SeriesInputProps) {
  const t = useTranslations('corelab.form')
  const options = field.options ?? []
  const selected = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <ToggleGroup
        type="multiple"
        disabled={readOnly}
        className="flex flex-wrap justify-start gap-1.5"
        value={selected}
        onValueChange={(next) => onChange(next.length === 0 ? null : next)}
        aria-label={field.name}
      >
        {options.map((option) => (
          <ToggleChip key={option} value={option} size="sm">
            {selected.includes(option) ? <Check className="size-3.5" strokeWidth={2.6} /> : null}
            {option}
          </ToggleChip>
        ))}
      </ToggleGroup>
      <span className="text-xs text-text-muted">
        {selected.length === 0 ? t('seriesHint') : t('seriesSelected', { count: selected.length, total: options.length })}
      </span>
    </div>
  )
}
