'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SingleSelect } from '@/components/ui/single-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { saveValueSetAction, saveVariableAction } from '../actions-library'
import type { LibraryBlock, LibraryVariable, ValueSet } from '@/lib/services/corelab/library'

type Tab = 'valueSets' | 'variables' | 'blocks'
const MODALITIES = ['CMR', 'CT', 'PET', 'ECHO'] as const
const TYPES = ['numeric', 'boolean', 'categorical', 'text', 'segment_categorical', 'segment_numeric', 'series_availability'] as const

type LibraryTabsProps = { valueSets: ValueSet[]; variables: LibraryVariable[]; blocks: LibraryBlock[] }

export function LibraryTabs({ valueSets, variables, blocks }: LibraryTabsProps) {
  const t = useTranslations('corelab.library')
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('valueSets')

  const [valueSetOpen, setValueSetOpen] = useState(false)
  const [valueSet, setValueSet] = useState({ code: '', name: '', modality: 'CMR', description: '' })
  const [items, setItems] = useState([{ code: '', label: '', colour: '' }])

  const [variableOpen, setVariableOpen] = useState(false)
  const [variable, setVariable] = useState({ code: '', name: '', modality: 'CMR', type: 'numeric', valueSetId: '' })

  const saveSet = useAction(saveValueSetAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      setValueSetOpen(false)
      setValueSet({ code: '', name: '', modality: 'CMR', description: '' })
      setItems([{ code: '', label: '', colour: '' }])
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  const saveVar = useAction(saveVariableAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      setVariableOpen(false)
      setVariable({ code: '', name: '', modality: 'CMR', type: 'numeric', valueSetId: '' })
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-1 border-b border-border">
        {(['valueSets', 'variables', 'blocks'] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3.5 py-2 text-sm ${tab === key ? 'font-semibold text-text-primary shadow-[inset_0_-2px_0_var(--color-coral-600,#d61f55)]' : 'text-text-secondary'}`}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </nav>

      {tab === 'valueSets' ? (
        <section className="rounded-2xl border border-border bg-white p-6">
          <div className="flex justify-end">
            <Dialog open={valueSetOpen} onOpenChange={setValueSetOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" />{t('newValueSet')}</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader><DialogTitle>{t('newValueSet')}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="vs-code">{t('code')}</Label>
                      <Input id="vs-code" value={valueSet.code} onChange={(event) => setValueSet({ ...valueSet, code: event.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="vs-name">{t('name')}</Label>
                      <Input id="vs-name" value={valueSet.name} onChange={(event) => setValueSet({ ...valueSet, name: event.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm">{t('modality')}</span>
                    <SingleSelect
                      options={MODALITIES.map((value) => ({ value, label: value }))}
                      value={valueSet.modality}
                      onChange={(value) => setValueSet({ ...valueSet, modality: value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm">{t('values')}</span>
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input placeholder={t('code')} value={item.code} onChange={(event) => setItems(items.map((entry, position) => position === index ? { ...entry, code: event.target.value } : entry))} />
                        <Input placeholder={t('label')} value={item.label} onChange={(event) => setItems(items.map((entry, position) => position === index ? { ...entry, label: event.target.value } : entry))} />
                        <Input type="color" className="w-16" value={item.colour || '#ECFDF5'} onChange={(event) => setItems(items.map((entry, position) => position === index ? { ...entry, colour: event.target.value } : entry))} />
                        <Button type="button" variant="ghost" size="sm" onClick={() => setItems(items.filter((unused, position) => position !== index))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { code: '', label: '', colour: '' }])}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    disabled={saveSet.isPending}
                    onClick={() => saveSet.execute({
                      code: valueSet.code,
                      name: valueSet.name,
                      modality: valueSet.modality as 'CMR',
                      description: valueSet.description,
                      items: items.filter((item) => item.code && item.label).map((item, index) => ({ ...item, colour: item.colour || null, order: index })),
                    })}
                  >
                    {t('save')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {valueSets.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">{t('emptyValueSets')}</p>
          ) : (
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('modality')}</TableHead>
                  <TableHead>{t('values')}</TableHead>
                  <TableHead>{t('usedBy')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valueSets.map((set) => (
                  <TableRow key={set.id} data-testid={`value-set-${set.code}`}>
                    <TableCell>
                      <span className="font-medium text-text-primary">{set.name}</span>
                      <span className="block text-xs text-text-secondary">{set.code}</span>
                    </TableCell>
                    <TableCell className="text-text-secondary">{set.modality}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {set.items.map((item) => (
                          <span
                            key={item.id}
                            className="rounded-md border px-1.5 py-0.5 text-[11px]"
                            style={item.colour ? { background: item.colour, borderColor: item.colour } : undefined}
                          >
                            {item.label}{item.deprecated ? ` (${t('deprecated')})` : ''}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-text-secondary">{set._count.variables}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      ) : null}

      {tab === 'variables' ? (
        <section className="rounded-2xl border border-border bg-white p-6">
          <div className="flex justify-end">
            <Dialog open={variableOpen} onOpenChange={setVariableOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" />{t('newVariable')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t('newVariable')}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="var-code">{t('code')}</Label>
                      <Input id="var-code" value={variable.code} onChange={(event) => setVariable({ ...variable, code: event.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="var-name">{t('name')}</Label>
                      <Input id="var-name" value={variable.name} onChange={(event) => setVariable({ ...variable, name: event.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm">{t('type')}</span>
                    <SingleSelect
                      options={TYPES.map((value) => ({ value, label: value }))}
                      value={variable.type}
                      onChange={(value) => setVariable({ ...variable, type: value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm">{t('modality')}</span>
                    <SingleSelect
                      options={MODALITIES.map((value) => ({ value, label: value }))}
                      value={variable.modality}
                      onChange={(value) => setVariable({ ...variable, modality: value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm">{t('tabs.valueSets')}</span>
                    <SingleSelect
                      options={valueSets.map((set) => ({ value: set.id, label: set.name }))}
                      value={variable.valueSetId}
                      onChange={(value) => setVariable({ ...variable, valueSetId: value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    disabled={saveVar.isPending}
                    onClick={() => saveVar.execute({
                      code: variable.code,
                      name: variable.name,
                      modality: variable.modality as 'CMR',
                      type: variable.type as 'numeric',
                      params: {},
                      valueSetId: variable.valueSetId || null,
                    })}
                  >
                    {t('save')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {variables.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">{t('emptyVariables')}</p>
          ) : (
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('modality')}</TableHead>
                  <TableHead>{t('tabs.valueSets')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variables.map((entry) => (
                  <TableRow key={entry.id} data-testid={`variable-${entry.code}`}>
                    <TableCell>
                      <span className="font-medium text-text-primary">{entry.name}</span>
                      <span className="block text-xs text-text-secondary">{entry.code}</span>
                    </TableCell>
                    <TableCell className="text-text-secondary">{entry.type}</TableCell>
                    <TableCell className="text-text-secondary">{entry.modality}</TableCell>
                    <TableCell className="text-text-secondary">{entry.valueSet?.name ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      ) : null}

      {tab === 'blocks' ? (
        <section className="rounded-2xl border border-border bg-white p-6">
          {blocks.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('emptyBlocks')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('kind')}</TableHead>
                  <TableHead>{t('modality')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map((block) => (
                  <TableRow key={block.id}>
                    <TableCell>
                      <span className="font-medium text-text-primary">{block.name}</span>
                      <span className="block text-xs text-text-secondary">{block.code}</span>
                    </TableCell>
                    <TableCell className="text-text-secondary">{t(`kinds.${block.kind}`)}</TableCell>
                    <TableCell className="text-text-secondary">{block.modality}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      ) : null}
    </div>
  )
}
