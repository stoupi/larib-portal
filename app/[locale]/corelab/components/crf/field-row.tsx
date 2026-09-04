'use client'

import { useTranslations } from 'next-intl'
import { isOutOfBounds, nextSource } from '@/lib/corelab/crf/values'
import { FieldInputNumeric } from './field-input-numeric'
import { FieldInputBoolean } from './field-input-boolean'
import { FieldInputCategorical } from './field-input-categorical'
import { FieldInputText } from './field-input-text'
import { FieldInputSeries } from './field-input-series'
import { BullsEye } from './bulls-eye'
import { FlagMenu } from './flag-menu'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'
import type { FieldValue, SegmentValues } from '@/types/corelab'

type FieldRowProps = {
  field: FieldDefinition
  value: FieldValue | undefined
  onChange: (value: FieldValue | null) => void
  readOnly: boolean
}

const SOURCE_STYLE: Record<FieldValue['source'], string> = {
  MANUAL: 'border-neutral-200 bg-neutral-100 text-neutral-600',
  IMPORTED: 'border-blue-200 bg-blue-50 text-blue-700',
  MODIFIED: 'border-amber-200 bg-amber-50 text-amber-800',
}

export function FieldRow({ field, value, onChange, readOnly }: FieldRowProps) {
  const t = useTranslations('corelab.form')

  function emit(raw: unknown) {
    if (raw === null || raw === undefined) {
      onChange(value ? { ...value, value: null, source: nextSource(value.source) } : null)
      return
    }
    onChange({ value: raw, source: nextSource(value?.source), flag: value?.flag ?? null, flagNote: value?.flagNote ?? null })
  }

  const outOfBounds = isOutOfBounds(field, value?.value)

  return (
    <div className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0 md:flex-row md:items-start md:justify-between">
      <div className="md:w-1/3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{field.name}</span>
          {value ? (
            <span data-testid={`source-${field.id}`} className={`rounded-md border px-1.5 py-0.5 text-[11px] ${SOURCE_STYLE[value.source]}`}>
              {t(`source.${value.source}`)}
            </span>
          ) : (
            <span className="rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[11px] text-neutral-500">
              {t('toFill')}
            </span>
          )}
          {value?.flag ? (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">
              {t(`flags.${value.flag}`)}
            </span>
          ) : null}
        </div>
        {outOfBounds ? (
          <p className="mt-1 text-xs text-red-600">
            {t('outOfBounds', { min: field.min ?? '', max: field.max ?? '' })}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 items-start gap-2">
        <div className="flex-1" data-field={field.id}>
          {field.type === 'numeric' ? (
            <FieldInputNumeric field={field} value={value?.value} onChange={emit} readOnly={readOnly} />
          ) : field.type === 'boolean' ? (
            <FieldInputBoolean field={field} value={value?.value} onChange={emit} readOnly={readOnly} />
          ) : field.type === 'categorical' ? (
            <FieldInputCategorical field={field} value={value?.value} onChange={emit} readOnly={readOnly} />
          ) : field.type === 'text' ? (
            <FieldInputText field={field} value={value?.value} onChange={emit} readOnly={readOnly} />
          ) : field.type === 'series_availability' ? (
            <FieldInputSeries field={field} value={value?.value} onChange={emit} readOnly={readOnly} />
          ) : (
            <BullsEye
              field={field}
              value={(value?.value ?? undefined) as SegmentValues | undefined}
              onChange={emit}
              readOnly={readOnly}
            />
          )}
        </div>
        <FlagMenu
          flag={value?.flag ?? null}
          flagNote={value?.flagNote ?? null}
          disabled={readOnly}
          onChange={(flag, flagNote) =>
            onChange({ value: value?.value ?? null, source: value?.source ?? 'MANUAL', flag, flagNote })
          }
        />
      </div>
    </div>
  )
}
