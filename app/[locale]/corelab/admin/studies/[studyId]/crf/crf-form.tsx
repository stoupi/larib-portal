'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CornerDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FieldControl } from '@/app/[locale]/corelab/components/crf/field-control'
import { defaultSequenceValues } from '@/lib/corelab/crf/values'
import { fieldOrigin, referenceOf, type FieldOrigin } from '@/lib/corelab/crf/origin'
import { BandButton, EditorInput, GripIcon, PaneBand, StatStrip } from '@/app/[locale]/corelab/components/crf/pane-chrome'
import { OriginMark, OriginTag } from './crf-origin-mark'
import type { FieldDefinition, SectionDefinition, SequenceDefinition } from '@/lib/corelab/crf/schema'

function ControlPreview({ field }: { field: FieldDefinition }) {
  const initial = defaultSequenceValues({
    id: 'preview',
    name: 'preview',
    sections: [{ id: 'preview', name: 'preview', fields: [field] }],
  })[field.id]
  const [value, setValue] = useState<unknown>(initial?.value)
  return <FieldControl field={field} value={value} onChange={setValue} readOnly={false} />
}

function conditionLabel(field: FieldDefinition, section: SectionDefinition): string | null {
  if (!field.conditionalOn) return null
  const reference = section.fields.find((candidate) => candidate.id === field.conditionalOn?.fieldId)
  const value = field.conditionalOn.value
  const shown = value === true ? 'Yes' : value === false ? 'No' : String(value)
  return `${reference?.name ?? field.conditionalOn.fieldId} = ${shown}`
}

export type FormActions = {
  selectField: (fieldId: string) => void
  openAdd: () => void
  renamePart: (name: string) => void
  renameSection: (name: string) => void
}

export function CrfForm({ part, section, references, view, actions }: {
  part: SequenceDefinition
  section: SectionDefinition
  references: Map<string, FieldDefinition>
  view: { fieldId: string; ghost: FieldDefinition | null; origin: FieldOrigin }
  actions: FormActions
}) {
  const t = useTranslations('corelab.crfEditor')
  const words = useTranslations('corelab.crf')
  const [renaming, setRenaming] = useState(false)
  const required = section.fields.filter((field) => field.required).length
  const conditional = section.fields.filter((field) => field.conditionalOn).length
  const origins = section.fields.map((field) => fieldOrigin(field, referenceOf(field, references)))
  const tuned = origins.filter((entry) => entry === 'TUNED').length
  const studyOnly = origins.filter((entry) => entry === 'STUDY_ONLY').length
  const rows = section.fields.flatMap((field) =>
    view.ghost && field.id === view.fieldId ? [{ field, ghost: false }, { field: view.ghost, ghost: true }] : [{ field, ghost: false }],
  )

  return (
    <>
      <PaneBand
        kind={renaming ? t('partName') : t('partNamed', { name: part.name })}
        title={
          renaming ? (
            <span className="flex w-full max-w-md flex-col gap-1.5">
              <EditorInput value={part.name} onChange={actions.renamePart} options={{ label: t('partName') }} />
              <EditorInput value={section.name} onChange={actions.renameSection} options={{ label: t('sectionName') }} />
            </span>
          ) : (
            <>
              {section.name}
              <span className={cn(
                'rounded-md border px-1.5 py-px text-[11px] font-medium',
                view.origin === 'LIBRARY' ? 'border-white/45 bg-white/15 text-white' : 'border-warn-50 bg-warn-50 font-semibold text-warn-700',
              )}>
                {view.origin === 'LIBRARY' ? t('sectionLibrary') : view.origin === 'TUNED' ? t('sectionTuned') : t('sectionStudyOnly')}
              </span>
            </>
          )
        }
        subtitle={renaming ? undefined : t('breadcrumb', { part: part.id, section: section.id })}
        action={
          renaming ? (
            <BandButton filled onClick={() => setRenaming(false)}>{t('doneRenaming')}</BandButton>
          ) : (
            <>
              <BandButton onClick={() => setRenaming(true)}>{t('rename')}</BandButton>
              <BandButton filled onClick={actions.openAdd}>{t('addVariable')}</BandButton>
            </>
          )
        }
      />
      <StatStrip
        hint={words('readerPreview')}
        items={[
          { value: String(section.fields.length), label: words('variablesLabel', { count: section.fields.length }) },
          { value: String(required), label: words('requiredLabel', { count: required }) },
          { value: String(conditional), label: t('conditionalLabel') },
          { value: String(tuned), label: t('tunedLabel', { count: tuned }) },
          { value: String(studyOnly), label: t('studyOnlyLabel', { count: studyOnly }) },
        ]}
      />
      <div className="flex-1 overflow-y-auto px-3 pb-4 pt-1.5">
        {rows.map(({ field, ghost }) => {
          const origin = ghost ? 'STUDY_ONLY' : fieldOrigin(field, referenceOf(field, references))
          const condition = conditionLabel(field, section)
          const selected = !ghost && field.id === view.fieldId && view.ghost === null
          return (
            <div
              key={ghost ? 'ghost' : field.id}
              data-testid={ghost ? 'crf-field-ghost' : `crf-field-${field.id}`}
              onClick={() => (ghost ? undefined : actions.selectField(field.id))}
              className={cn(
                'group flex cursor-pointer items-start gap-3 rounded-[10px] border-b border-gray-100 px-2.5 py-2.5 hover:bg-gray-25',
                selected ? 'bg-gray-25 shadow-[inset_2px_0_0_var(--color-coral-600)]' : '',
                ghost ? 'my-1.5 rounded-xl border border-dashed border-coral-300 bg-coral-50/40' : '',
              )}
            >
              <span className="mt-1"><GripIcon /></span>
              <div className="w-[15.5rem] flex-none">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13.5px] font-medium text-text-primary">{field.name}</span>
                  {field.required ? <span className="text-sm leading-none text-coral-600">*</span> : null}
                  {ghost ? <OriginTag tone="new">{t('tagCreating')}</OriginTag> : <OriginMark origin={origin} />}
                </div>
                <div className="mt-0.5 font-mono text-[11.5px] text-text-muted">{field.id || t('emptyValue')}</div>
                {condition ? (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-warn-100 bg-warn-50 px-1.5 py-px text-[10.5px] text-warn-700">
                    <CornerDownRight className="size-2.5" />
                    {condition}
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                {field.id === '' ? (
                  <span className="text-[12.5px] text-text-placeholder">{t('blankHintType')}</span>
                ) : (
                  <ControlPreview key={`${field.id}-${field.type}-${JSON.stringify(field.options ?? [])}`} field={field} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
