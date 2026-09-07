'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Info, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { saveValueSetAction } from '../actions-library'
import { InspectorHeader, InspectorSection, LibraryLayout, PaneHeader, RailButton, RailHeader, SummaryStrip, WarningNote } from './library-chrome'
import { FieldPreview } from './field-preview'
import type { ValueSet } from '@/lib/services/corelab/library'

type ValueSetsPaneProps = { valueSets: ValueSet[] }
type DraftItem = { code: string; label: string; colour: string | null }
type Draft = { name: string; description: string; items: DraftItem[] }

export function ValueSetsPane({ valueSets }: ValueSetsPaneProps) {
  const t = useTranslations('corelab.library')
  const router = useRouter()
  const [id, setId] = useState(valueSets[0]?.id ?? '')
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})

  const valueSet = valueSets.find((entry) => entry.id === id) ?? valueSets[0] ?? null
  const stored: Draft | null = valueSet
    ? { name: valueSet.name, description: valueSet.description, items: valueSet.items.map((item) => ({ code: item.code, label: item.label, colour: item.colour })) }
    : null
  const draft = valueSet ? drafts[valueSet.id] ?? stored : null
  const dirty = Boolean(valueSet && drafts[valueSet.id])

  const save = useAction(saveValueSetAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      if (valueSet) setDrafts((current) => ({ ...current, [valueSet.id]: undefined as never }))
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  if (!valueSet || !draft) {
    return <p className="rounded-2xl border border-border bg-white p-6 text-sm text-text-secondary">{t('emptyValueSets')}</p>
  }

  function patch(next: Partial<Draft>) {
    if (!valueSet || !draft) return
    setDrafts((current) => ({ ...current, [valueSet.id]: { ...draft, ...next } }))
  }

  const usable = draft.items.filter((item) => item.code.trim() !== '' && item.label.trim() !== '')
  const coloured = usable.filter((item) => item.colour)

  return (
    <LibraryLayout
      rail={
        <>
          <RailHeader title={t('modalityRail')} count={t('valueSetCount', { count: valueSets.length })} />
          <div className="p-1.5">
            {valueSets.map((entry) => (
              <RailButton
                key={entry.id}
                testId={`value-set-${entry.code}`}
                label={entry.name}
                meta={t('valueSetMeta', { values: entry.items.length, variables: entry._count.variables })}
                selected={entry.id === valueSet.id}
                onClick={() => setId(entry.id)}
                leading={
                  <span className="flex shrink-0 gap-px">
                    {entry.items.slice(0, 4).map((item) => (
                      <span key={item.id} className="h-5 w-[7px] rounded-[2px] border border-line" style={{ background: item.colour ?? '#f5f7fa' }} />
                    ))}
                  </span>
                }
              />
            ))}
          </div>
        </>
      }
      main={
        <>
          <PaneHeader title={draft.name} code={valueSet.code} badges={[t('valueSetBadge'), valueSet.modality]} />
          <SummaryStrip
            hint={coloured.length > 0 ? t('renderedOnBullseye') : t('renderedAsChips')}
            items={[
              { value: String(draft.items.length), label: t('valuesLabel') },
              { value: String(valueSet._count.variables), label: t('usedByLabel') },
            ]}
          />
          <div className="px-5 pb-2 pt-4">
            <div className="grid grid-cols-[150px_minmax(0,1fr)_92px_36px] gap-2.5 border-b border-gray-100 px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">
              <span>{t('code')}</span>
              <span>{t('label')}</span>
              <span>{t('colour')}</span>
              <span />
            </div>
            {draft.items.map((item, index) => (
              <div key={index} className="grid grid-cols-[150px_minmax(0,1fr)_92px_36px] items-center gap-2.5 border-b border-gray-100 px-2 py-1.5">
                <Input
                  aria-label={t('code')}
                  value={item.code}
                  className="h-8 font-mono text-xs"
                  onChange={(event) => patch({ items: draft.items.map((entry, position) => position === index ? { ...entry, code: event.target.value } : entry) })}
                />
                <Input
                  aria-label={t('label')}
                  value={item.label}
                  className="h-8"
                  onChange={(event) => patch({ items: draft.items.map((entry, position) => position === index ? { ...entry, label: event.target.value } : entry) })}
                />
                <Input
                  type="color"
                  aria-label={t('colour')}
                  value={item.colour ?? '#ffffff'}
                  className="h-8 w-16 p-1"
                  onChange={(event) => patch({ items: draft.items.map((entry, position) => position === index ? { ...entry, colour: event.target.value } : entry) })}
                />
                <Button
                  variant="ghost" size="icon" className="size-8"
                  aria-label={t('removeValue')}
                  onClick={() => patch({ items: draft.items.filter((unused, position) => position !== index) })}
                >
                  <Trash2 className="size-4 text-gray-300" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline" size="sm" className="mt-3 gap-1.5"
              onClick={() => patch({ items: [...draft.items, { code: '', label: '', colour: null }] })}
            >
              <Plus className="size-4" />
              {t('addValue')}
            </Button>
          </div>

          {usable.length > 0 ? (
            <div className="m-5 rounded-xl border border-gray-100 bg-gray-25 px-4 py-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">{t('readerPreview')}</p>
              <FieldPreview
                key={`${valueSet.id}-${usable.map((item) => item.label).join('|')}-${coloured.length}`}
                field={{
                  id: 'preview',
                  name: draft.name || valueSet.code,
                  type: coloured.length > 0 ? 'segment_categorical' : 'categorical',
                  required: false,
                  ...(coloured.length > 0 ? { segmentCount: 17 as const } : {}),
                  options: usable.map((item) => item.label),
                  optionColours: Object.fromEntries(coloured.map((item) => [item.label, item.colour as string])),
                }}
              />
            </div>
          ) : null}
        </>
      }
      inspector={
        <>
          <InspectorHeader kind={t('valueSetBadge')} title={draft.name} subtitle={valueSet.code} />
          <div className="px-4 pb-5 pt-4">
            <InspectorSection title={t('name')}>
              <Input value={draft.name} aria-label={t('name')} onChange={(event) => patch({ name: event.target.value })} />
            </InspectorSection>
            <InspectorSection title={t('description')}>
              <Textarea rows={3} value={draft.description} aria-label={t('description')} onChange={(event) => patch({ description: event.target.value })} />
            </InspectorSection>
            <InspectorSection title={t('usedBy')}>
              <p className="text-[13px] leading-relaxed text-text-primary">
                {t('usedByCount', { count: valueSet._count.variables })}
              </p>
            </InspectorSection>
            <div className="mb-4">
              <WarningNote>
                <Info className="mt-px size-4 shrink-0 text-warn-600" />
                <p>{t('deprecationRule')}</p>
              </WarningNote>
            </div>
            <Button
              variant="primary"
              className="w-full"
              disabled={!dirty || save.isPending || usable.length === 0}
              onClick={() => save.execute({
                valueSetId: valueSet.id,
                code: valueSet.code,
                name: draft.name,
                modality: valueSet.modality,
                description: draft.description,
                items: usable.map((item, order) => ({ code: item.code, label: item.label, colour: item.colour, order })),
              })}
            >
              {dirty ? t('save') : t('saved')}
            </Button>
          </div>
        </>
      }
    />
  )
}
