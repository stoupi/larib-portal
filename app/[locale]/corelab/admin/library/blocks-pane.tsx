'use client'

import { useMemo, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { blockSummary, danglingConditions, groupBlocks, readBlockDefinition, sectionsOf, conditionCandidates } from '@/lib/corelab/library/blocks'
import { saveBlockAction } from '../actions-library'
import { LibraryLayout, PaneHeader, RailButton, RailHeader, SummaryStrip, WarningNote } from './library-chrome'
import { FieldPreview } from './field-preview'
import { EmptyInspector, VariableInspector } from './variable-inspector'
import type { FieldDefinition, SectionDefinition, SequenceDefinition } from '@/lib/corelab/crf/schema'
import type { LibraryBlock } from '@/lib/services/corelab/library'

type BlocksPaneProps = { blocks: LibraryBlock[] }

function replaceField(definition: SectionDefinition | SequenceDefinition, previousId: string, next: FieldDefinition) {
  const swap = (section: SectionDefinition): SectionDefinition => ({
    ...section,
    fields: section.fields.map((field) => (field.id === previousId ? next : field)),
  })
  return 'sections' in definition
    ? { ...definition, sections: definition.sections.map(swap) }
    : swap(definition)
}

export function BlocksPane({ blocks }: BlocksPaneProps) {
  const t = useTranslations('corelab.library')
  const router = useRouter()
  const groups = useMemo(() => groupBlocks(blocks), [blocks])

  const [blockId, setBlockId] = useState(() => blocks.find((block) => block.kind === 'SECTION')?.id ?? blocks[0]?.id ?? '')
  const [openSequences, setOpenSequences] = useState<Record<string, boolean>>(() => ({ [groups[0]?.sequence?.code ?? '']: true }))
  const [fieldId, setFieldId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, SectionDefinition | SequenceDefinition>>({})

  const block = blocks.find((entry) => entry.id === blockId) ?? blocks[0] ?? null
  const stored = block ? readBlockDefinition(block.definition) : null
  const definition = block ? draft[block.id] ?? stored : null
  const dirty = Boolean(block && draft[block.id])

  const save = useAction(saveBlockAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      if (block) setDraft((current) => ({ ...current, [block.id]: undefined as never }))
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  if (!block || !definition) {
    return <p className="rounded-2xl border border-border bg-white p-6 text-sm text-text-secondary">{t('emptyBlocks')}</p>
  }

  const sections = sectionsOf(definition)
  const fields = sections.flatMap((section) => section.fields)
  const selected = fields.find((field) => field.id === fieldId) ?? fields[0] ?? null
  const summary = blockSummary(definition)
  const dangling = danglingConditions(definition)

  return (
    <LibraryLayout
      rail={
        <>
          <RailHeader title={t('modalityRail')} count={t('blockCount', { count: blocks.length })} />
          <div className="p-1.5">
            {groups.map((group) => {
              const key = group.sequence?.code ?? 'loose'
              const open = openSequences[key] ?? false
              const active = group.sequence?.id === block.id || group.sections.some((section) => section.id === block.id)
              return (
                <div key={key}>
                  <RailButton
                    label={group.sequence?.name ?? t('looseSections')}
                    meta={t('sectionCount', { count: group.sections.length })}
                    selected={active}
                    leading={<ChevronRight className={cn('size-3.5 text-text-muted transition-transform', open ? 'rotate-90' : '')} />}
                    onClick={() => {
                      setOpenSequences((current) => ({ ...current, [key]: !open }))
                      if (group.sequence) {
                        setBlockId(group.sequence.id)
                        setFieldId(null)
                      }
                    }}
                  />
                  {open ? (
                    <div className="ml-5 flex flex-col border-l border-gray-100 pl-3">
                      {group.sections.map((section) => (
                        <RailButton
                          key={section.id}
                          indented
                          label={section.name.split('—').pop()?.trim() ?? section.name}
                          selected={section.id === block.id}
                          onClick={() => { setBlockId(section.id); setFieldId(null) }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </>
      }
      main={
        <>
          <PaneHeader title={block.name} code={block.code} badges={[t(`kinds.${block.kind}`), block.modality]} />
          <SummaryStrip
            hint={t('readerPreview')}
            items={[
              { value: String(summary.fields), label: t('variablesLabel', { count: summary.fields }) },
              { value: String(summary.required), label: t('requiredLabel', { count: summary.required }) },
              { value: String(summary.thresholds), label: t('thresholdLabel', { count: summary.thresholds }) },
            ]}
          />
          {dangling.length > 0 ? (
            <div className="px-5 pt-4">
              <WarningNote>
                <AlertTriangle className="mt-px size-4 shrink-0 text-warn-600" />
                <p>{t('danglingBlock', { count: dangling.length, fields: dangling.map((entry) => entry.fieldName).join(', ') })}</p>
              </WarningNote>
            </div>
          ) : null}
          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto px-3 pb-4 pt-1">
            {sections.map((section) => (
              <div key={section.id}>
                {sections.length > 1 ? (
                  <p className="px-2.5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">{section.name}</p>
                ) : null}
                {section.fields.map((field) => (
                  <div
                    key={field.id}
                    data-testid={`block-field-${field.id}`}
                    onFocusCapture={() => setFieldId(field.id)}
                    className={cn(
                      'rounded-lg px-2.5 hover:bg-gray-25 [&_[data-slot=field-name]]:cursor-pointer',
                      field.id === selected?.id ? 'bg-gray-25 shadow-[inset_2px_0_0_var(--color-coral-600)]' : '',
                    )}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest('[data-slot=field-name]')) setFieldId(field.id)
                    }}
                  >
                    <FieldPreview key={`${block.id}-${field.id}-${JSON.stringify(field.defaultValue)}`} field={field} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      }
      inspector={
        selected ? (
          <VariableInspector
            input={{
              field: selected,
              valueSet: null,
              candidates: conditionCandidates(definition, selected.id),
              usage: [],
              onChange: (next) => setDraft((current) => ({
                ...current,
                [block.id]: replaceField(definition, selected.id, next),
              })),
              save: {
                pending: save.isPending,
                dirty,
                run: () => save.execute({
                  blockId: block.id,
                  code: block.code,
                  name: block.name,
                  kind: block.kind,
                  modality: block.modality,
                  definition,
                }),
              },
            }}
          />
        ) : (
          <EmptyInspector message={t('emptyBlockFields')} />
        )
      }
    />
  )
}
