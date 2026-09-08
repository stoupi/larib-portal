'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { fieldDiffs, fieldOrigin, type OriginDiff } from '@/lib/corelab/crf/origin'
import { asIdentifier } from '@/lib/corelab/crf/identifier'
import { Cap, ChoiceChip, EditorInput, OriginNote, PaneBand, PaneFooter } from './crf-chrome'
import type { FieldDefinition, SectionDefinition } from '@/lib/corelab/crf/schema'

const TYPES_WITH_BOUNDS = new Set(['numeric', 'segment_numeric'])

export type InspectorActions = {
  change: (field: FieldDefinition) => void
  revert: () => void
  promote: () => void
  remove: () => void
}

function numberOrUndefined(raw: string): number | undefined {
  return raw === '' ? undefined : Number(raw)
}

export function CrfInspector({ field, reference, section, modality, actions }: {
  field: FieldDefinition
  reference: FieldDefinition | null
  section: SectionDefinition
  modality: string
  actions: InspectorActions
}) {
  const t = useTranslations('corelab.crfEditor')
  const types = useTranslations('corelab.library.types')
  const origin = fieldOrigin(field, reference)
  const diffs = reference ? fieldDiffs(field, reference) : []
  const conditionField = field.conditionalOn
    ? section.fields.find((candidate) => candidate.id === field.conditionalOn?.fieldId)
    : null

  function patch(next: Partial<FieldDefinition>) {
    actions.change({ ...field, ...next } as FieldDefinition)
  }

  function shown(value: OriginDiff['from']): string {
    if (value === undefined || value === null || value === '') return t('emptyValue')
    if (value === true) return t('yes')
    if (value === false) return t('no')
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'object') return Object.values(value as Record<string, unknown>).join(' / ')
    return String(value)
  }

  return (
    <>
      <PaneBand kind={t('variableKind')} title={field.name} subtitle={types(field.type)} />
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4">
          <Cap>{t('origin')}</Cap>
          {origin === 'LIBRARY' ? (
            <OriginNote tone="library">{t('originLibrary', { code: field.id })}</OriginNote>
          ) : null}
          {origin === 'TUNED' ? (
            <OriginNote tone="tuned">
              <p className="m-0">{t('originTuned')}</p>
              <ul className="mt-1.5 list-disc pl-4">
                {diffs.map((diff) => (
                  <li key={diff.key}>
                    {t('diff', { label: t(`diffKeys.${diff.key}`), from: shown(diff.from), to: shown(diff.to) })}
                  </li>
                ))}
              </ul>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={actions.revert}>{t('revert')}</Button>
                <Button variant="outline" size="sm" onClick={actions.promote}>{t('promoteTuned')}</Button>
              </div>
            </OriginNote>
          ) : null}
          {origin === 'STUDY_ONLY' ? (
            <OriginNote tone="study">
              <p className="m-0">{t('originStudyOnly', { modality })}</p>
              <div className="mt-2.5">
                <Button variant="outline" size="sm" onClick={actions.promote}>{t('promoteStudyOnly')}</Button>
              </div>
            </OriginNote>
          ) : null}
        </div>

        <div className="mb-4">
          <Cap>{t('exportName')}</Cap>
          <EditorInput value={field.id} onChange={(value) => patch({ id: asIdentifier(value) })} options={{ mono: true, label: t('exportName') }} />
        </div>

        <div className="mb-4">
          <Cap>{t('acceptedEntry')}</Cap>
          <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2">
            {TYPES_WITH_BOUNDS.has(field.type) ? (
              <>
                <span className="text-[13px] text-text-secondary">{t('min')}</span>
                <EditorInput value={field.min === undefined ? '' : String(field.min)} onChange={(value) => patch({ min: numberOrUndefined(value) })} options={{ type: 'number', label: t('min') }} />
                <span className="text-[13px] text-text-secondary">{t('max')}</span>
                <EditorInput value={field.max === undefined ? '' : String(field.max)} onChange={(value) => patch({ max: numberOrUndefined(value) })} options={{ type: 'number', label: t('max') }} />
                <span className="text-[13px] text-text-secondary">{t('unit')}</span>
                <EditorInput value={field.unit ?? ''} onChange={(value) => patch({ unit: value === '' ? undefined : value })} options={{ placeholder: t('none'), label: t('unit') }} />
              </>
            ) : null}
            <span className="text-[13px] text-text-secondary">{t('required')}</span>
            <span className="inline-flex gap-1.5">
              <ChoiceChip label={t('yes')} selected={field.required} onClick={() => patch({ required: true })} />
              <ChoiceChip label={t('no')} selected={!field.required} onClick={() => patch({ required: false })} />
            </span>
          </div>
        </div>

        <div className="mb-4">
          <Cap>{t('display')}</Cap>
          {conditionField ? (
            <p className="m-0 rounded-[10px] border border-line bg-gray-25 p-2.5 text-[12.5px] leading-relaxed text-gray-700">
              {t('conditionReads', {
                field: conditionField.name,
                value: field.conditionalOn?.value === true ? 'Yes' : field.conditionalOn?.value === false ? 'No' : String(field.conditionalOn?.value ?? ''),
              })}
            </p>
          ) : (
            <p className="m-0 text-[12.5px] text-text-secondary">{t('always')}</p>
          )}
        </div>

        {field.calibrationTolerance || field.discordanceThreshold ? (
          <div className="mb-4">
            <Cap>{t('tolerances')}</Cap>
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2 text-[13px]">
              <span className="text-text-secondary">{t('calibration')}</span>
              <span className="tabular-nums text-text-primary">
                {field.calibrationTolerance
                  ? t('calibrationValue', {
                      absolute: field.calibrationTolerance.absolute,
                      unit: field.unit ? ` ${field.unit}` : '',
                      relative: field.calibrationTolerance.relativePercent,
                    })
                  : t('emptyValue')}
              </span>
              <span className="text-text-secondary">{t('discordance')}</span>
              <span className="tabular-nums text-text-primary">
                {field.discordanceThreshold
                  ? t('discordanceValue', {
                      minor: field.discordanceThreshold.minorPercent,
                      major: field.discordanceThreshold.majorPercent,
                    })
                  : t('noThreshold')}
              </span>
            </div>
          </div>
        ) : null}

        {(field.options ?? []).length > 0 ? (
          <div className="mb-4">
            <Cap>{t('valueSet')}</Cap>
            <div className="flex flex-wrap gap-1.5">
              {(field.options ?? []).map((option) => (
                <span key={option} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2 py-0.5 text-xs text-gray-700">
                  <span className="size-2.5 rounded-[3px] border border-line" style={{ background: field.optionColours?.[option] ?? '#ffffff' }} />
                  {option}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <PaneFooter>
        <Button variant="outline" className="flex-1 text-danger-600" onClick={actions.remove}>{t('removeFromCrf')}</Button>
      </PaneFooter>
    </>
  )
}
