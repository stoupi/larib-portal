'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { fieldDiffs, fieldOrigin, type OriginDiff } from '@/lib/corelab/crf/origin'
import { conditionCandidates } from '@/lib/corelab/library/blocks'
import { VariableSettings } from '@/app/[locale]/corelab/components/crf/variable-settings'
import { Cap, PaneBand, PaneFooter } from '@/app/[locale]/corelab/components/crf/pane-chrome'
import { OriginNote } from './crf-origin-mark'
import type { FieldDefinition, SectionDefinition } from '@/lib/corelab/crf/schema'

export type InspectorActions = {
  change: (field: FieldDefinition) => void
  revert: () => void
  promote: () => void
  remove: () => void
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

        <VariableSettings
          field={field}
          onChange={actions.change}
          context={{ valueSet: null, candidates: conditionCandidates(section, field.id), usage: [] }}
        />
      </div>
      <PaneFooter>
        <Button variant="outline" className="w-full text-danger-600" onClick={actions.remove}>{t('removeFromCrf')}</Button>
      </PaneFooter>
    </>
  )
}
