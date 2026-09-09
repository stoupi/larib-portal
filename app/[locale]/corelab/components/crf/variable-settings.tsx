'use client'

import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'
import { SingleSelect } from '@/components/ui/single-select'
import { ChoiceChip, InspectorSection, LabelledInput, ValueSetChips, WarningNote } from './field-controls'
import { GuidanceEditor } from './guidance-editor'
import { asIdentifier } from '@/lib/corelab/crf/identifier'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

const TYPES_WITH_BOUNDS = new Set(['numeric', 'segment_numeric'])

export type VariableSettingsContext = {
  valueSet: { name: string; code: string; items: Array<{ label: string; colour: string | null }> } | null
  candidates: FieldDefinition[]
  usage: Array<{ code: string; name: string }>
}

export function hasInvalidBounds(field: FieldDefinition): boolean {
  return field.min !== undefined && field.max !== undefined && field.min > field.max
}

function numberOrUndefined(raw: string): number | undefined {
  return raw === '' ? undefined : Number(raw)
}

// Every setting a variable carries, shown the same way in the library and in a study's CRF.
export function VariableSettings({ field, onChange, context }: {
  field: FieldDefinition
  onChange: (field: FieldDefinition) => void
  context: VariableSettingsContext
}) {
  const t = useTranslations('corelab.library.inspector')
  const { valueSet, candidates, usage } = context

  const reference = field.conditionalOn
    ? candidates.find((candidate) => candidate.id === field.conditionalOn?.fieldId) ?? null
    : null
  const dangling = Boolean(field.conditionalOn) && candidates.length > 0 && !reference
  const boundsInvalid = hasInvalidBounds(field)
  const conditionValues = reference
    ? reference.type === 'boolean' ? [true, false] : (reference.options ?? [])
    : []
  const defaultChips = field.type === 'boolean' ? ['Yes', 'No'] : (field.options ?? [])
  // Available series accept several values at once, so their default is a list.
  const multiple = field.type === 'series_availability'
  const defaultSeries = multiple && Array.isArray(field.defaultValue)
    ? field.defaultValue.filter((entry): entry is string => typeof entry === 'string')
    : []

  function chipValue(label: string): unknown {
    return field.type === 'boolean' ? label === 'Yes' : label
  }

  function nextDefault(label: string): unknown {
    if (multiple) {
      const next = defaultSeries.includes(label)
        ? defaultSeries.filter((entry) => entry !== label)
        : [...defaultSeries, label]
      return next.length === 0 ? undefined : next
    }
    return field.defaultValue === chipValue(label) ? undefined : chipValue(label)
  }

  function patch(next: Partial<FieldDefinition>) {
    onChange({ ...field, ...next } as FieldDefinition)
  }

  return (
    <>
      <InspectorSection title={t('exportName')}>
        <input
          aria-label={t('exportName')}
          value={field.id}
          onChange={(event) => patch({ id: asIdentifier(event.target.value) })}
          className="h-9 w-full rounded-[10px] border border-line bg-white px-2.5 font-mono text-[13px] text-text-primary outline-none"
        />
        <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{t('exportHint')}</p>
      </InspectorSection>

      <InspectorSection title={t('accepted')}>
        <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2">
          {TYPES_WITH_BOUNDS.has(field.type) ? (
            <>
              <LabelledInput
                label={t('min')} type="number" invalid={boundsInvalid}
                value={field.min === undefined ? '' : String(field.min)}
                onChange={(value) => patch({ min: numberOrUndefined(value) })}
              />
              <LabelledInput
                label={t('max')} type="number" invalid={boundsInvalid}
                value={field.max === undefined ? '' : String(field.max)}
                onChange={(value) => patch({ max: numberOrUndefined(value) })}
              />
              <LabelledInput
                label={t('unit')} placeholder={t('noUnit')}
                value={field.unit ?? ''}
                onChange={(value) => patch({ unit: value === '' ? undefined : value })}
              />
            </>
          ) : null}
          <span className="text-[13px] text-text-secondary">{t('required')}</span>
          <span className="inline-flex gap-1.5">
            <ChoiceChip label={t('yes')} selected={field.required} onClick={() => patch({ required: true })} />
            <ChoiceChip label={t('no')} selected={!field.required} onClick={() => patch({ required: false })} />
          </span>
        </div>
        {boundsInvalid ? <p className="mt-2 text-xs text-danger-500">{t('boundsInvalid')}</p> : null}
      </InspectorSection>

      <InspectorSection
        title={t('defaultValue')}
        action={field.defaultValue === undefined ? undefined : (
          <button type="button" onClick={() => patch({ defaultValue: undefined })} className="cursor-pointer text-xs font-medium text-text-secondary">
            {t('none')}
          </button>
        )}
      >
        {field.type === 'numeric' ? (
          <input
            type="number"
            aria-label={t('defaultValue')}
            value={typeof field.defaultValue === 'number' ? String(field.defaultValue) : ''}
            placeholder={t('none')}
            onChange={(event) => patch({ defaultValue: numberOrUndefined(event.target.value) })}
            className="h-8 w-36 rounded-[10px] border border-line bg-white px-2.5 text-[13px] tabular-nums outline-none"
          />
        ) : defaultChips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {defaultChips.map((label) => (
              <ChoiceChip
                key={label}
                label={label}
                selected={multiple ? defaultSeries.includes(label) : field.defaultValue === chipValue(label)}
                onClick={() => patch({ defaultValue: nextDefault(label) })}
              />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-text-muted">{t('defaultNotApplicable')}</p>
        )}
        <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
          {field.type === 'segment_categorical' || field.type === 'segment_numeric' ? t('defaultSegmentHint') : t('defaultHint')}
        </p>
      </InspectorSection>

      <InspectorSection title={t('display')}>
        {candidates.length === 0 ? (
          <p className="text-[13px] leading-snug text-text-primary">
            {field.conditionalOn ? t('conditionReadOnly', { field: field.conditionalOn.fieldId }) : t('always')}
          </p>
        ) : (
          <>
            <div className="mb-2.5 flex gap-1.5">
              <ChoiceChip label={t('always')} selected={!field.conditionalOn} onClick={() => patch({ conditionalOn: undefined })} />
              <ChoiceChip
                label={t('conditional')}
                selected={Boolean(field.conditionalOn)}
                onClick={() => {
                  if (field.conditionalOn) return
                  const first = candidates[0]
                  patch({ conditionalOn: { fieldId: first.id, value: first.type === 'boolean' ? true : (first.options ?? [])[0] } })
                }}
              />
            </div>
            {field.conditionalOn ? (
              <div className="rounded-[10px] border border-gray-100 bg-gray-25 p-3">
                <span className="mb-1.5 block text-xs text-text-secondary">{t('visibleIf')}</span>
                <SingleSelect
                  className="mb-2.5"
                  options={candidates.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
                  value={field.conditionalOn.fieldId}
                  onChange={(value) => {
                    const next = candidates.find((candidate) => candidate.id === value)
                    if (!next) return
                    patch({ conditionalOn: { fieldId: next.id, value: next.type === 'boolean' ? true : (next.options ?? [])[0] } })
                  }}
                />
                <span className="mb-1.5 block text-xs text-text-secondary">{t('equals')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {conditionValues.map((value) => (
                    <ChoiceChip
                      key={String(value)}
                      label={value === true ? t('yes') : value === false ? t('no') : String(value)}
                      selected={field.conditionalOn?.value === value}
                      onClick={() => patch({ conditionalOn: { fieldId: field.conditionalOn?.fieldId ?? '', value } })}
                    />
                  ))}
                </div>
                {dangling ? (
                  <div className="mt-3">
                    <WarningNote>
                      <AlertTriangle className="mt-px size-4 shrink-0 text-warn-600" />
                      <p>{t('danglingCondition', { field: field.conditionalOn.fieldId })}</p>
                    </WarningNote>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </InspectorSection>

      <InspectorSection title={t('guidance')}>
        <GuidanceEditor guidance={field.guidance} onChange={(next) => patch({ guidance: next })} />
      </InspectorSection>

      <InspectorSection title={t('tolerated')}>
        <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2">
          <LabelledInput
            label={t('calibrationAbsolute')} type="number"
            value={field.calibrationTolerance ? String(field.calibrationTolerance.absolute) : ''}
            onChange={(value) => patch({
              calibrationTolerance: value === ''
                ? undefined
                : { absolute: Number(value), relativePercent: field.calibrationTolerance?.relativePercent ?? 0 },
            })}
          />
          <LabelledInput
            label={t('calibrationRelative')} type="number"
            value={field.calibrationTolerance ? String(field.calibrationTolerance.relativePercent) : ''}
            onChange={(value) => patch({
              calibrationTolerance: value === ''
                ? undefined
                : { absolute: field.calibrationTolerance?.absolute ?? 0, relativePercent: Number(value) },
            })}
          />
          <LabelledInput
            label={t('minorPercent')} type="number"
            value={field.discordanceThreshold ? String(field.discordanceThreshold.minorPercent) : ''}
            onChange={(value) => patch({
              discordanceThreshold: value === ''
                ? undefined
                : { minorPercent: Number(value), majorPercent: field.discordanceThreshold?.majorPercent ?? 0 },
            })}
          />
          <LabelledInput
            label={t('majorPercent')} type="number"
            value={field.discordanceThreshold ? String(field.discordanceThreshold.majorPercent) : ''}
            onChange={(value) => patch({
              discordanceThreshold: value === ''
                ? undefined
                : { minorPercent: field.discordanceThreshold?.minorPercent ?? 0, majorPercent: Number(value) },
            })}
          />
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{t('thresholdHint')}</p>
      </InspectorSection>

      {valueSet ? (
        <InspectorSection title={t('valueSet')}>
          <div className="rounded-[10px] border border-gray-100 bg-gray-25 p-3">
            <div className="text-[13px] text-text-primary">{valueSet.name}</div>
            <div className="mb-2 mt-0.5 font-mono text-[11px] text-text-muted">{valueSet.code}</div>
            <ValueSetChips items={valueSet.items} />
          </div>
        </InspectorSection>
      ) : null}

      {usage.length > 0 ? (
        <InspectorSection title={t('presentIn')}>
          <div className="flex flex-col gap-1.5">
            {usage.map((entry) => (
              <div key={entry.code} className="rounded-[9px] border border-gray-100 bg-gray-25 px-2.5 py-1.5 text-[13px] leading-snug text-text-primary">
                {entry.name}
              </div>
            ))}
          </div>
        </InspectorSection>
      ) : null}
    </>
  )
}
