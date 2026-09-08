'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Cap, ChoiceChip, EditorInput, OriginNote, PaneBand, PaneFooter } from './crf-chrome'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

const TYPES = [
  'numeric',
  'boolean',
  'categorical',
  'text',
  'segment_categorical',
  'segment_numeric',
  'series_availability',
] as const

const TYPES_WITH_BOUNDS = new Set<string>(['numeric', 'segment_numeric'])
const TYPES_WITH_OPTIONS = new Set<string>(['categorical', 'segment_categorical', 'series_availability'])
const TYPES_WITH_SEGMENTS = new Set<string>(['segment_categorical', 'segment_numeric'])

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export type AddActions = {
  insert: (field: FieldDefinition) => void
  setTab: (tab: 'library' | 'create') => void
  setDraft: (field: FieldDefinition) => void
  commit: () => void
  close: () => void
}

export function CrfAddPanel({ candidates, draft, context, actions }: {
  candidates: FieldDefinition[]
  draft: FieldDefinition | null
  context: { sectionName: string; fieldName: string | null; modality: string; tab: 'library' | 'create' }
  actions: AddActions
}) {
  const t = useTranslations('corelab.crfEditor')
  const types = useTranslations('corelab.library.types')
  const [search, setSearch] = useState('')
  const [idTouched, setIdTouched] = useState(false)
  const [pendingValue, setPendingValue] = useState('')

  const needle = search.trim().toLowerCase()
  const shown = candidates.filter(
    (field) => needle === '' || field.name.toLowerCase().includes(needle) || field.id.includes(needle),
  )
  const creating = context.tab === 'create' && draft !== null

  function patchDraft(next: Partial<FieldDefinition>) {
    if (!draft) return
    actions.setDraft({ ...draft, ...next } as FieldDefinition)
  }

  return (
    <>
      <PaneBand
        kind={t('addTitle')}
        title={creating ? (draft?.name || t('unnamed')) : t('libraryPanel', { modality: context.modality })}
        subtitle={
          context.fieldName
            ? t('addWhere', { section: context.sectionName, field: context.fieldName })
            : t('addAtEnd', { section: context.sectionName })
        }
      />
      <div className="flex gap-1.5 border-b border-gray-100 px-4 py-3">
        {(['library', 'create'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            data-testid={`crf-add-tab-${tab}`}
            onClick={() => actions.setTab(tab)}
            className={cn(
              'inline-flex h-7 cursor-pointer items-center rounded-[9px] border px-2.5 text-[12.5px]',
              context.tab === tab
                ? 'border-coral-600 bg-coral-50 font-semibold text-coral-700'
                : 'border-line bg-white text-text-secondary hover:bg-gray-50',
            )}
          >
            {tab === 'library' ? t('addFromLibrary') : t('addCreate')}
          </button>
        ))}
      </div>

      {context.tab === 'library' ? (
        <>
          <div className="px-4 pb-2.5 pt-3">
            <EditorInput value={search} onChange={setSearch} placeholder={t('searchVariable')} />
          </div>
          <div className="flex-1 overflow-y-auto px-2.5 pb-2.5">
            {shown.map((field) => (
              <button
                key={field.id}
                type="button"
                data-testid={`crf-candidate-${field.id}`}
                onClick={() => actions.insert(field)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[10px] p-2 text-left hover:bg-coral-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-gray-700">{field.name}</span>
                  <span className="block truncate text-[11px] text-text-muted">{field.id} · {types(field.type)}</span>
                </span>
                <span className="inline-flex size-5 flex-none items-center justify-center rounded-md border border-line bg-white text-coral-600">
                  <Plus className="size-3" />
                </span>
              </button>
            ))}
            {shown.length === 0 ? <p className="p-3 text-sm text-text-secondary">{t('alreadyThere')}</p> : null}
          </div>
          <PaneFooter>
            <Button variant="ghost" className="w-full" onClick={actions.close}>{t('close')}</Button>
          </PaneFooter>
        </>
      ) : null}

      {creating && draft ? (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="mb-4">
              <Cap>{t('readerName')}</Cap>
              <EditorInput
                value={draft.name}
                placeholder={t('readerNamePlaceholder')}
                onChange={(value) => patchDraft({ name: value, ...(idTouched ? {} : { id: slugify(value) }) })}
              />
            </div>
            <div className="mb-4">
              <Cap>{t('exportName')}</Cap>
              <EditorInput
                mono
                value={draft.id}
                onChange={(value) => {
                  setIdTouched(true)
                  patchDraft({ id: value })
                }}
              />
              <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{t('exportHint')}</p>
            </div>
            <div className="mb-4">
              <Cap>{t('typeOfEntry')}</Cap>
              <div className="flex flex-col gap-px">
                {TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    data-testid={`crf-type-${type}`}
                    onClick={() =>
                      patchDraft({
                        type,
                        ...(TYPES_WITH_SEGMENTS.has(type) ? { segmentCount: draft.segmentCount ?? 17 } : { segmentCount: undefined }),
                        ...(TYPES_WITH_OPTIONS.has(type) ? {} : { options: undefined }),
                      })
                    }
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 rounded-[9px] border border-transparent px-2 py-1.5 text-left text-[13px] text-gray-700 hover:bg-gray-50',
                      draft.type === type ? 'border-coral-600 bg-coral-50 font-semibold text-coral-700' : '',
                    )}
                  >
                    {types(type)}
                  </button>
                ))}
              </div>
            </div>
            {TYPES_WITH_BOUNDS.has(draft.type) ? (
              <div className="mb-4">
                <Cap>{t('acceptedEntry')}</Cap>
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2">
                  <span className="text-[13px] text-text-secondary">{t('min')}</span>
                  <EditorInput type="number" value={draft.min === undefined ? '' : String(draft.min)} onChange={(value) => patchDraft({ min: value === '' ? undefined : Number(value) })} />
                  <span className="text-[13px] text-text-secondary">{t('max')}</span>
                  <EditorInput type="number" value={draft.max === undefined ? '' : String(draft.max)} onChange={(value) => patchDraft({ max: value === '' ? undefined : Number(value) })} />
                  <span className="text-[13px] text-text-secondary">{t('unit')}</span>
                  <EditorInput value={draft.unit ?? ''} placeholder={t('none')} onChange={(value) => patchDraft({ unit: value === '' ? undefined : value })} />
                </div>
              </div>
            ) : null}
            {TYPES_WITH_OPTIONS.has(draft.type) ? (
              <div className="mb-4">
                <Cap>{t('values')}</Cap>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {(draft.options ?? []).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-label={t('removeValue')}
                      onClick={() => patchDraft({ options: (draft.options ?? []).filter((entry) => entry !== option) })}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-white px-2 py-0.5 text-xs text-gray-700 hover:border-danger-500"
                    >
                      {option}
                      <X className="size-3 text-text-muted" />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <EditorInput value={pendingValue} onChange={setPendingValue} placeholder={t('addValue')} />
                  <Button
                    variant="outline"
                    className="flex-none"
                    onClick={() => {
                      const value = pendingValue.trim()
                      if (value === '') return
                      patchDraft({ options: [...(draft.options ?? []), value] })
                      setPendingValue('')
                    }}
                  >
                    {t('add')}
                  </Button>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{t('valuesHint')}</p>
              </div>
            ) : null}
            {TYPES_WITH_SEGMENTS.has(draft.type) ? (
              <div className="mb-4">
                <Cap>{t('segmentModel')}</Cap>
                <span className="inline-flex gap-1.5">
                  <ChoiceChip label={t('segments17')} selected={draft.segmentCount !== 16} onClick={() => patchDraft({ segmentCount: 17 })} />
                  <ChoiceChip label={t('segments16')} selected={draft.segmentCount === 16} onClick={() => patchDraft({ segmentCount: 16 })} />
                </span>
              </div>
            ) : null}
            <div className="mb-4">
              <Cap>{t('required')}</Cap>
              <span className="inline-flex gap-1.5">
                <ChoiceChip label={t('yes')} selected={draft.required} onClick={() => patchDraft({ required: true })} />
                <ChoiceChip label={t('no')} selected={!draft.required} onClick={() => patchDraft({ required: false })} />
              </span>
            </div>
            <OriginNote tone="study">{t('createWarning', { modality: context.modality })}</OriginNote>
          </div>
          <PaneFooter>
            <Button variant="ghost" className="flex-none" onClick={actions.close}>{t('cancel')}</Button>
            <Button className="flex-1 bg-coral-600 text-white hover:bg-coral-700" onClick={actions.commit}>{t('addToCrf')}</Button>
          </PaneFooter>
        </>
      ) : null}
    </>
  )
}
