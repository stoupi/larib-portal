'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SingleSelect } from '@/components/ui/single-select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { fieldDefinitionSchema, type FieldDefinition } from '@/lib/corelab/crf/schema'
import { fieldToVariableParams } from '@/lib/corelab/library/params'
import { saveVariableAction } from '../actions-library'
import { ChoiceChip, LabelledInput } from './inspector-controls'
import { FieldPreview } from './field-preview'
import { toFieldCode } from './slug'
import type { ValueSet } from '@/lib/services/corelab/library'

const TYPES = ['numeric', 'boolean', 'categorical', 'segment_categorical', 'segment_numeric', 'series_availability', 'text'] as const
const NEEDS_VALUE_SET = new Set(['categorical', 'segment_categorical', 'series_availability'])
const NEEDS_SEGMENTS = new Set(['segment_categorical', 'segment_numeric'])
const HAS_BOUNDS = new Set(['numeric', 'segment_numeric'])

type Draft = {
  name: string
  code: string
  codeTouched: boolean
  type: (typeof TYPES)[number]
  required: boolean
  unit: string
  min: string
  max: string
  segmentCount: 16 | 17
  valueSetId: string
  defaultValue: unknown
  toleranceAbsolute: string
  toleranceRelative: string
  minorPercent: string
  majorPercent: string
}

const EMPTY: Draft = {
  name: '', code: '', codeTouched: false, type: 'numeric', required: true,
  unit: '', min: '', max: '', segmentCount: 17, valueSetId: '', defaultValue: undefined,
  toleranceAbsolute: '', toleranceRelative: '', minorPercent: '', majorPercent: '',
}

function numberOrUndefined(raw: string): number | undefined {
  return raw.trim() === '' ? undefined : Number(raw)
}

export function NewVariableDialog({ valueSets }: { valueSets: ValueSet[] }) {
  const t = useTranslations('corelab.library')
  const tt = useTranslations('corelab.library.types')
  const ti = useTranslations('corelab.library.inspector')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)

  const save = useAction(saveVariableAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      setOpen(false)
      setDraft(EMPTY)
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  const valueSet = valueSets.find((entry) => entry.id === draft.valueSetId) ?? null
  const items = valueSet?.items ?? []
  const usesValueSet = NEEDS_VALUE_SET.has(draft.type)
  const colours = Object.fromEntries(items.filter((item) => item.colour).map((item) => [item.label, item.colour as string]))

  const candidate = {
    id: draft.code || 'code',
    name: draft.name || t('newVariable'),
    type: draft.type,
    required: draft.required,
    ...(draft.unit.trim() === '' ? {} : { unit: draft.unit.trim() }),
    ...(numberOrUndefined(draft.min) === undefined ? {} : { min: numberOrUndefined(draft.min) }),
    ...(numberOrUndefined(draft.max) === undefined ? {} : { max: numberOrUndefined(draft.max) }),
    ...(NEEDS_SEGMENTS.has(draft.type) ? { segmentCount: draft.segmentCount } : {}),
    ...(draft.defaultValue === undefined ? {} : { defaultValue: draft.defaultValue }),
    ...(numberOrUndefined(draft.toleranceAbsolute) === undefined && numberOrUndefined(draft.toleranceRelative) === undefined
      ? {}
      : { calibrationTolerance: { absolute: numberOrUndefined(draft.toleranceAbsolute) ?? 0, relativePercent: numberOrUndefined(draft.toleranceRelative) ?? 0 } }),
    ...(numberOrUndefined(draft.minorPercent) === undefined && numberOrUndefined(draft.majorPercent) === undefined
      ? {}
      : { discordanceThreshold: { minorPercent: numberOrUndefined(draft.minorPercent) ?? 0, majorPercent: numberOrUndefined(draft.majorPercent) ?? 0 } }),
    ...(items.length > 0 ? { options: items.map((item) => item.label), optionColours: colours } : {}),
  }

  const parsed = fieldDefinitionSchema.safeParse(candidate)
  const field: FieldDefinition | null = parsed.success ? parsed.data : null
  const ready = Boolean(field) && draft.name.trim().length >= 2 && /^[a-z0-9_]{2,}$/.test(draft.code) && (!usesValueSet || Boolean(valueSet))
  const defaultChips = draft.type === 'boolean' ? ['Yes', 'No'] : items.map((item) => item.label)
  const multipleDefault = draft.type === 'series_availability'
  const defaultSeries = multipleDefault && Array.isArray(draft.defaultValue)
    ? draft.defaultValue.filter((entry): entry is string => typeof entry === 'string')
    : []

  function nextDefault(label: string): unknown {
    if (multipleDefault) {
      const next = defaultSeries.includes(label) ? defaultSeries.filter((entry) => entry !== label) : [...defaultSeries, label]
      return next.length === 0 ? undefined : next
    }
    const value = draft.type === 'boolean' ? label === 'Yes' : label
    return draft.defaultValue === value ? undefined : value
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" className="gap-2"><Plus className="size-4" />{t('newVariable')}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{t('newVariable')}</DialogTitle></DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_250px]">
          <div className="space-y-1.5">
            <Label htmlFor="var-name">{t('readerName')}</Label>
            <Input
              id="var-name"
              value={draft.name}
              onChange={(event) => setDraft({
                ...draft,
                name: event.target.value,
                code: draft.codeTouched ? draft.code : toFieldCode(event.target.value),
              })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="var-code">{ti('exportName')}</Label>
            <Input id="var-code" className="font-mono text-xs" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value, codeTouched: true })} />
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">{t('inputType')}</span>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((type) => (
              <ChoiceChip
                key={type}
                label={tt(type)}
                selected={draft.type === type}
                onClick={() => setDraft({ ...draft, type, defaultValue: undefined, valueSetId: NEEDS_VALUE_SET.has(type) ? draft.valueSetId : '' })}
              />
            ))}
          </div>
        </div>

        {HAS_BOUNDS.has(draft.type) ? (
          <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2">
            <LabelledInput label={ti('min')} type="number" value={draft.min} onChange={(value) => setDraft({ ...draft, min: value })} />
            <LabelledInput label={ti('max')} type="number" value={draft.max} onChange={(value) => setDraft({ ...draft, max: value })} />
            <LabelledInput label={ti('unit')} value={draft.unit} placeholder={ti('noUnit')} onChange={(value) => setDraft({ ...draft, unit: value })} />
          </div>
        ) : null}

        {usesValueSet ? (
          <div className="space-y-1.5">
            <Label>{t('tabs.valueSets')}</Label>
            <SingleSelect
              options={valueSets.map((entry) => ({ value: entry.id, label: `${entry.name} — ${entry.items.length}` }))}
              value={draft.valueSetId}
              onChange={(value) => setDraft({ ...draft, valueSetId: value, defaultValue: undefined })}
            />
          </div>
        ) : null}

        {NEEDS_SEGMENTS.has(draft.type) ? (
          <div className="flex gap-1.5">
            {([16, 17] as const).map((count) => (
              <ChoiceChip
                key={count}
                label={t('segmentsCount', { count })}
                selected={draft.segmentCount === count}
                onClick={() => setDraft({ ...draft, segmentCount: count })}
              />
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">{ti('required')}</span>
            <div className="flex gap-1.5">
              <ChoiceChip label={ti('yes')} selected={draft.required} onClick={() => setDraft({ ...draft, required: true })} />
              <ChoiceChip label={ti('no')} selected={!draft.required} onClick={() => setDraft({ ...draft, required: false })} />
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">{ti('defaultValue')}</span>
            {draft.type === 'numeric' ? (
              <Input
                type="number"
                className="w-36"
                placeholder={ti('none')}
                value={typeof draft.defaultValue === 'number' ? String(draft.defaultValue) : ''}
                onChange={(event) => setDraft({ ...draft, defaultValue: numberOrUndefined(event.target.value) })}
              />
            ) : defaultChips.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {defaultChips.map((label) => (
                  <ChoiceChip
                    key={label}
                    label={label}
                    selected={multipleDefault ? defaultSeries.includes(label) : draft.defaultValue === (draft.type === 'boolean' ? label === 'Yes' : label)}
                    onClick={() => setDraft({ ...draft, defaultValue: nextDefault(label) })}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-text-muted">{ti('defaultNotApplicable')}</p>
            )}
          </div>
        </div>

        {draft.type === 'numeric' ? (
          <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2">
            <LabelledInput label={ti('calibrationAbsolute')} type="number" value={draft.toleranceAbsolute} onChange={(value) => setDraft({ ...draft, toleranceAbsolute: value })} />
            <LabelledInput label={ti('calibrationRelative')} type="number" value={draft.toleranceRelative} onChange={(value) => setDraft({ ...draft, toleranceRelative: value })} />
            <LabelledInput label={ti('minorPercent')} type="number" value={draft.minorPercent} onChange={(value) => setDraft({ ...draft, minorPercent: value })} />
            <LabelledInput label={ti('majorPercent')} type="number" value={draft.majorPercent} onChange={(value) => setDraft({ ...draft, majorPercent: value })} />
          </div>
        ) : null}

        {field ? (
          <div className="rounded-xl border border-gray-100 bg-gray-25 px-4 py-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">{t('readerPreview')}</p>
            <FieldPreview key={JSON.stringify(field)} field={field} />
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="primary"
            disabled={!ready || save.isPending}
            onClick={() => {
              if (!field) return
              save.execute({
                code: field.id,
                name: field.name,
                modality: 'CMR',
                type: field.type,
                params: fieldToVariableParams(field),
                valueSetId: draft.valueSetId || null,
              })
            }}
          >
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
