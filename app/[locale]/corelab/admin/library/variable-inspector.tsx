'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { InspectorHeader } from './library-chrome'
import { VariableSettings, hasInvalidBounds, type VariableSettingsContext } from '@/app/[locale]/corelab/components/crf/variable-settings'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

export type InspectorInput = VariableSettingsContext & {
  field: FieldDefinition
  onChange: (field: FieldDefinition) => void
  save: { run: () => void; pending: boolean; dirty: boolean }
}

export function VariableInspector({ input }: { input: InspectorInput }) {
  const { field, valueSet, candidates, usage, onChange, save } = input
  const t = useTranslations('corelab.library.inspector')
  const tt = useTranslations('corelab.library.types')

  return (
    <>
      <InspectorHeader kind={t('kind')} title={field.name} subtitle={tt(field.type)} />
      <div className="px-4 pb-5 pt-4">
        <VariableSettings field={field} onChange={onChange} context={{ valueSet, candidates, usage }} />
        <Button
          variant="primary"
          className="w-full"
          disabled={!save.dirty || save.pending || hasInvalidBounds(field)}
          onClick={save.run}
        >
          {save.dirty ? t('save') : t('saved')}
        </Button>
      </div>
    </>
  )
}

export function EmptyInspector({ message }: { message: string }) {
  return <div className="p-6 text-sm text-text-secondary">{message}</div>
}
