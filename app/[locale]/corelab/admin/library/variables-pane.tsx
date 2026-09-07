'use client'

import { useMemo, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fieldToVariableParams, variableToFieldDefinition } from '@/lib/corelab/library/params'
import { saveVariableAction } from '../actions-library'
import { LibraryLayout, PaneHeader, RailButton, RailHeader, SummaryStrip } from './library-chrome'
import { FieldPreview } from './field-preview'
import { EmptyInspector, VariableInspector } from './variable-inspector'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'
import type { LibraryVariableWithUsage, ValueSet } from '@/lib/services/corelab/library'

type VariablesPaneProps = { variables: LibraryVariableWithUsage[]; valueSets: ValueSet[] }

const GROUPS = [
  { id: 'all', types: null },
  { id: 'numeric', types: ['numeric'] },
  { id: 'boolean', types: ['boolean'] },
  { id: 'categorical', types: ['categorical'] },
  { id: 'segment', types: ['segment_categorical', 'segment_numeric'] },
  { id: 'series', types: ['series_availability'] },
] as const

export function VariablesPane({ variables, valueSets }: VariablesPaneProps) {
  const t = useTranslations('corelab.library')
  const router = useRouter()
  const [group, setGroup] = useState<(typeof GROUPS)[number]['id']>('all')
  const [search, setSearch] = useState('')
  const [code, setCode] = useState(variables[0]?.code ?? '')
  const [draft, setDraft] = useState<Record<string, FieldDefinition>>({})

  const itemsOf = useMemo(
    () => new Map(valueSets.map((valueSet) => [valueSet.id, valueSet])),
    [valueSets],
  )

  function fieldOf(variable: LibraryVariableWithUsage): FieldDefinition | null {
    const items = itemsOf.get(variable.valueSet?.id ?? '')?.items ?? []
    try {
      return variableToFieldDefinition(variable, items)
    } catch {
      return null
    }
  }

  const needle = search.trim().toLowerCase()
  const active = GROUPS.find((entry) => entry.id === group) ?? GROUPS[0]
  const shown = variables.filter((variable) =>
    (active.types === null || (active.types as readonly string[]).includes(variable.type))
    && (needle === '' || variable.name.toLowerCase().includes(needle) || variable.code.includes(needle)))

  const current = variables.find((variable) => variable.code === code) ?? shown[0] ?? variables[0] ?? null
  const storedField = current ? fieldOf(current) : null
  const field = current ? draft[current.code] ?? storedField : null
  const dirty = Boolean(current && draft[current.code])
  const valueSet = current ? itemsOf.get(current.valueSet?.id ?? '') ?? null : null

  const save = useAction(saveVariableAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      if (current) setDraft((entries) => ({ ...entries, [current.code]: undefined as never }))
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  if (variables.length === 0) {
    return <p className="rounded-2xl border border-border bg-white p-6 text-sm text-text-secondary">{t('emptyVariables')}</p>
  }

  return (
    <LibraryLayout
      rail={
        <>
          <RailHeader title={t('modalityRail')} count={t('variableCount', { count: variables.length })} />
          <div className="p-2.5">
            <div className="mb-2.5 flex h-8 items-center gap-1.5 rounded-[10px] border border-line bg-gray-25 px-2.5">
              <Search className="size-3.5 text-text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('searchVariable')}
                aria-label={t('searchVariable')}
                className="min-w-0 flex-1 bg-transparent text-[13px] text-text-primary outline-none"
              />
            </div>
            <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">{t('type')}</p>
            {GROUPS.map((entry) => (
              <RailButton
                key={entry.id}
                label={t(`groups.${entry.id}`)}
                selected={entry.id === group}
                onClick={() => setGroup(entry.id)}
                trailing={
                  <span className="text-[11px] tabular-nums text-text-muted">
                    {entry.types === null ? variables.length : variables.filter((variable) => (entry.types as readonly string[]).includes(variable.type)).length}
                  </span>
                }
              />
            ))}
          </div>
        </>
      }
      main={
        <>
          <PaneHeader title={t(`groups.${group}`)} badges={['CMR']} />
          <SummaryStrip
            hint={t('readerPreview')}
            items={[
              { value: String(shown.length), label: t('shownLabel') },
              { value: String(shown.filter((variable) => variable.usedIn.length > 1).length), label: t('sharedLabel') },
              { value: String(shown.filter((variable) => variable.usedIn.length === 0).length), label: t('orphanLabel') },
            ]}
          />
          <div className="px-3 pb-4 pt-1">
            {shown.map((variable) => {
              const preview = fieldOf(variable)
              if (!preview) return null
              return (
                <div
                  key={variable.id}
                  role="button"
                  tabIndex={0}
                  data-testid={`variable-${variable.code}`}
                  onClick={() => setCode(variable.code)}
                  onKeyDown={(event) => { if (event.key === 'Enter') setCode(variable.code) }}
                  className={cn(
                    'cursor-pointer rounded-lg px-2.5 hover:bg-gray-25',
                    variable.code === current?.code ? 'bg-gray-25 shadow-[inset_2px_0_0_var(--color-coral-600)]' : '',
                  )}
                >
                  <FieldPreview key={variable.id} field={preview} />
                  {variable.usedIn.length > 1 ? (
                    <p className="pb-2 text-[11px] text-success-600">{t('usedInBlocks', { count: variable.usedIn.length })}</p>
                  ) : null}
                </div>
              )
            })}
            {shown.length === 0 ? <p className="p-4 text-sm text-text-secondary">{t('noMatch')}</p> : null}
          </div>
        </>
      }
      inspector={
        current && field ? (
          <VariableInspector
            input={{
              field,
              valueSet: valueSet ? { name: valueSet.name, code: valueSet.code, items: valueSet.items } : null,
              candidates: [],
              usage: current.usedIn,
              onChange: (next) => setDraft((entries) => ({ ...entries, [current.code]: next })),
              save: {
                pending: save.isPending,
                dirty,
                run: () => save.execute({
                  variableId: current.id,
                  code: field.id,
                  name: field.name,
                  modality: current.modality,
                  type: field.type,
                  params: fieldToVariableParams(field),
                  valueSetId: current.valueSet?.id ?? null,
                }),
              },
            }}
          />
        ) : (
          <EmptyInspector message={t('emptyVariables')} />
        )
      }
    />
  )
}
