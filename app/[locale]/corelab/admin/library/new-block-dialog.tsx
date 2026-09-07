'use client'

import { useMemo, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { AlertTriangle, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { danglingConditions } from '@/lib/corelab/library/blocks'
import { variableToFieldDefinition } from '@/lib/corelab/library/params'
import { saveBlockAction } from '../actions-library'
import { ChoiceChip } from './inspector-controls'
import { FieldPreview } from './field-preview'
import { WarningNote } from './library-chrome'
import { toFieldCode } from './slug'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'
import type { LibraryVariableWithUsage, ValueSet } from '@/lib/services/corelab/library'

type NewBlockDialogProps = { variables: LibraryVariableWithUsage[]; valueSets: ValueSet[] }

export function NewBlockDialog({ variables, valueSets }: NewBlockDialogProps) {
  const t = useTranslations('corelab.library')
  const tt = useTranslations('corelab.library.types')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<'SECTION' | 'SEQUENCE'>('SECTION')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [codeTouched, setCodeTouched] = useState(false)
  const [search, setSearch] = useState('')
  const [chosen, setChosen] = useState<string[]>([])

  const itemsOf = useMemo(() => new Map(valueSets.map((valueSet) => [valueSet.id, valueSet.items])), [valueSets])

  const fieldOf = (variable: LibraryVariableWithUsage): FieldDefinition | null => {
    try {
      return variableToFieldDefinition(variable, itemsOf.get(variable.valueSet?.id ?? '') ?? [])
    } catch {
      return null
    }
  }

  const save = useAction(saveBlockAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      setOpen(false)
      setChosen([])
      setName('')
      setCode('')
      setCodeTouched(false)
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  const needle = search.trim().toLowerCase()
  const picked = chosen.map((entry) => variables.find((variable) => variable.code === entry)).filter(Boolean) as LibraryVariableWithUsage[]
  const fields = picked.map(fieldOf).filter(Boolean) as FieldDefinition[]
  const available = variables.filter((variable) =>
    !chosen.includes(variable.code)
    && (needle === '' || variable.name.toLowerCase().includes(needle) || variable.code.includes(needle)))

  const section = { id: code || 'code', name: name || t('newBlock'), fields }
  const definition = kind === 'SEQUENCE' ? { id: code || 'code', name: name || t('newBlock'), sections: [section] } : section
  const dangling = fields.length > 0 ? danglingConditions(definition) : []
  const missing = [...new Set(dangling.map((entry) => entry.referenceId))]
  const ready = name.trim().length >= 2 && /^[a-z0-9_]{2,}$/.test(code) && fields.length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" className="gap-2"><Plus className="size-4" />{t('newBlock')}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader><DialogTitle>{t('newBlock')}</DialogTitle></DialogHeader>

        <div className="grid items-end gap-3 sm:grid-cols-[240px_minmax(0,1fr)_240px]">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">{t('kind')}</span>
            <div className="flex gap-1.5">
              <ChoiceChip label={t('kinds.SECTION')} selected={kind === 'SECTION'} onClick={() => setKind('SECTION')} />
              <ChoiceChip label={t('kinds.SEQUENCE')} selected={kind === 'SEQUENCE'} onClick={() => setKind('SEQUENCE')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="block-name">{t('name')}</Label>
            <Input
              id="block-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (!codeTouched) setCode(toFieldCode(event.target.value))
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="block-code">{t('code')}</Label>
            <Input id="block-code" className="font-mono text-xs" value={code} onChange={(event) => { setCode(event.target.value); setCodeTouched(true) }} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="border-b border-gray-100 bg-gray-25 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">{t('libraryVariables')}</p>
              <div className="flex h-8 items-center gap-1.5 rounded-[9px] border border-line bg-white px-2.5">
                <Search className="size-3.5 text-text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('searchAmong', { count: variables.length })}
                  aria-label={t('searchVariable')}
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                />
              </div>
            </div>
            <div className="max-h-[380px] overflow-y-auto p-1.5">
              {available.map((variable) => (
                <button
                  key={variable.id}
                  type="button"
                  onClick={() => setChosen([...chosen, variable.code])}
                  className="mb-px flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left hover:bg-coral-50"
                >
                  <Plus className="size-4 shrink-0 text-coral-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-text-primary">{variable.name}</span>
                    <span className="block truncate font-mono text-[11px] text-text-muted">{variable.code}</span>
                  </span>
                  <span className="shrink-0 rounded-md border border-navy-100 bg-navy-50 px-1.5 py-px text-[11px] text-navy-600">{tt(variable.type)}</span>
                </button>
              ))}
              {available.length === 0 ? <p className="p-3 text-[13px] text-text-secondary">{t('noMatch')}</p> : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center gap-3 bg-navy-800 px-4 py-2.5 text-xs text-navy-200">
              <span><strong className="font-semibold text-white">{fields.length}</strong> {t('variablesLabel', { count: fields.length })}</span>
              <span className="text-navy-400">·</span>
              <span><strong className="font-semibold text-white">{fields.filter((field) => field.required).length}</strong> {t('requiredLabel', { count: fields.filter((field) => field.required).length })}</span>
              <span className="ml-auto text-navy-300">{t('readerPreview')}</span>
            </div>
            {fields.length === 0 ? (
              <p className="p-10 text-center text-sm text-text-secondary">{t('emptyBlockDraft')}</p>
            ) : (
              <div className="max-h-[380px] overflow-y-auto px-3 py-1">
                {picked.map((variable) => {
                  const field = fieldOf(variable)
                  if (!field) return null
                  const broken = dangling.some((entry) => entry.fieldId === field.id)
                  return (
                    <div key={variable.id} className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <FieldPreview key={variable.id} field={field} />
                        {broken ? <p className="pb-2 text-[11px] text-warn-600">{t('danglingField')}</p> : null}
                      </div>
                      <Button
                        variant="ghost" size="icon" className="mt-3 size-8"
                        aria-label={t('removeVariable')}
                        onClick={() => setChosen(chosen.filter((entry) => entry !== variable.code))}
                      >
                        <X className="size-4 text-gray-300" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {dangling.length > 0 ? (
          <WarningNote>
            <AlertTriangle className="mt-px size-4 shrink-0 text-warn-600" />
            <div>
              <p className="mb-2">{t('danglingBlock', { count: dangling.length, fields: dangling.map((entry) => entry.fieldName).join(', ') })}</p>
              <Button
                variant="outline" size="sm"
                onClick={() => setChosen([...missing.filter((entry) => variables.some((variable) => variable.code === entry)), ...chosen])}
              >
                {t('addMissing', { count: missing.length })}
              </Button>
            </div>
          </WarningNote>
        ) : null}

        <DialogFooter className="items-center">
          <span className="mr-auto text-xs text-text-muted">
            {fields.length === 0 ? t('blockNeedsVariable') : dangling.length > 0 ? t('blockNotSelfContained') : t('blockSelfContained')}
          </span>
          <Button
            variant="primary"
            disabled={!ready || save.isPending}
            onClick={() => save.execute({ code: code.trim(), name: name.trim(), kind, modality: 'CMR', definition })}
          >
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
