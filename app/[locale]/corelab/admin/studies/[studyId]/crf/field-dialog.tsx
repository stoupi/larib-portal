'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

type FieldDialogProps = {
  field: FieldDefinition | null
  onClose: () => void
  onSave: (field: FieldDefinition) => void
}

export function FieldDialog({ field, onClose, onSave }: FieldDialogProps) {
  const t = useTranslations('corelab.library.editor')
  const [draft, setDraft] = useState<FieldDefinition | null>(field)

  if (!field) return null
  const current = draft ?? field
  const numeric = current.type === 'numeric'
  const segment = current.type.startsWith('segment_')

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editField')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="field-name">{t('fieldName')}</Label>
            <Input id="field-name" value={current.name} onChange={(event) => setDraft({ ...current, name: event.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="field-required"
              checked={current.required}
              onCheckedChange={(next) => setDraft({ ...current, required: next })}
            />
            <Label htmlFor="field-required">{t('required')}</Label>
          </div>
          {numeric ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="field-unit">{t('unit')}</Label>
                <Input id="field-unit" value={current.unit ?? ''} onChange={(event) => setDraft({ ...current, unit: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field-min">{t('min')}</Label>
                <Input
                  id="field-min" type="number" value={current.min ?? ''}
                  onChange={(event) => setDraft({ ...current, min: event.target.value === '' ? undefined : Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field-max">{t('max')}</Label>
                <Input
                  id="field-max" type="number" value={current.max ?? ''}
                  onChange={(event) => setDraft({ ...current, max: event.target.value === '' ? undefined : Number(event.target.value) })}
                />
              </div>
            </div>
          ) : null}
          {segment ? (
            <div className="space-y-2">
              <Label htmlFor="field-segments">{t('segmentCount')}</Label>
              <Input
                id="field-segments" type="number" value={current.segmentCount ?? 17}
                onChange={(event) => setDraft({ ...current, segmentCount: Number(event.target.value) === 16 ? 16 : 17 })}
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={() => onSave(current)}>{t('apply')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
