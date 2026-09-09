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
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { saveValueSetAction } from '../actions-library'
import { FieldPreview } from './field-preview'
import { toFieldCode } from './slug'

type DraftItem = { code: string; label: string; colour: string | null }

const EMPTY = { name: '', code: '', codeTouched: false, description: '', items: [{ code: '', label: '', colour: null }] as DraftItem[] }

export function NewValueSetDialog() {
  const t = useTranslations('corelab.library')
  const words = useTranslations('corelab.crf')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY)

  const save = useAction(saveValueSetAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      setOpen(false)
      setDraft(EMPTY)
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  const usable = draft.items.filter((item) => item.code.trim() !== '' && item.label.trim() !== '')
  const coloured = usable.filter((item) => item.colour)
  const duplicate = usable.some((item, index) => usable.findIndex((entry) => entry.code === item.code) !== index)
  const ready = draft.name.trim().length >= 2 && draft.code.trim().length >= 2 && usable.length >= 2 && !duplicate

  function patchItem(index: number, patch: Partial<DraftItem>) {
    setDraft({ ...draft, items: draft.items.map((item, position) => (position === index ? { ...item, ...patch } : item)) })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" className="gap-2"><Plus className="size-4" />{t('newValueSet')}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{t('newValueSet')}</DialogTitle></DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-1.5">
            <Label htmlFor="vs-name">{t('name')}</Label>
            <Input
              id="vs-name"
              value={draft.name}
              onChange={(event) => setDraft({
                ...draft,
                name: event.target.value,
                code: draft.codeTouched ? draft.code : toFieldCode(event.target.value),
              })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vs-code">{t('code')}</Label>
            <Input
              id="vs-code"
              className="font-mono text-xs"
              value={draft.code}
              onChange={(event) => setDraft({ ...draft, code: event.target.value, codeTouched: true })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vs-description">{t('description')}</Label>
          <Textarea id="vs-description" rows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">{t('values')}</span>
          {draft.items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input placeholder={t('code')} className="w-36 font-mono text-xs" value={item.code} onChange={(event) => patchItem(index, { code: event.target.value })} />
              <Input placeholder={t('label')} value={item.label} onChange={(event) => patchItem(index, { label: event.target.value })} />
              <Input type="color" aria-label={t('colour')} className="w-16 p-1" value={item.colour ?? '#ffffff'} onChange={(event) => patchItem(index, { colour: event.target.value })} />
              <Button variant="ghost" size="icon" aria-label={words('removeValue')} onClick={() => setDraft({ ...draft, items: draft.items.filter((unused, position) => position !== index) })}>
                <Trash2 className="size-4 text-gray-300" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDraft({ ...draft, items: [...draft.items, { code: '', label: '', colour: null }] })}>
            <Plus className="size-4" />{words('addValue')}
          </Button>
          {duplicate ? <p className="text-xs text-danger-500">{t('duplicateValueCode')}</p> : null}
        </div>

        {usable.length > 0 ? (
          <div className="rounded-xl border border-gray-100 bg-gray-25 px-4 py-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">{words('readerPreview')}</p>
            <FieldPreview
              key={usable.map((item) => `${item.label}${item.colour}`).join('|')}
              field={{
                id: 'preview',
                name: draft.name || t('newValueSet'),
                type: coloured.length > 0 ? 'segment_categorical' : 'categorical',
                required: false,
                ...(coloured.length > 0 ? { segmentCount: 17 as const } : {}),
                options: usable.map((item) => item.label),
                optionColours: Object.fromEntries(coloured.map((item) => [item.label, item.colour as string])),
              }}
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="primary"
            disabled={!ready || save.isPending}
            onClick={() => save.execute({
              code: draft.code.trim(),
              name: draft.name.trim(),
              modality: 'CMR',
              description: draft.description.trim(),
              items: usable.map((item, order) => ({ code: item.code, label: item.label, colour: item.colour, order })),
            })}
          >
            {words('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
