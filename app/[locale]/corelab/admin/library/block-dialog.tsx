'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SingleSelect } from '@/components/ui/single-select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { saveBlockAction } from '../actions-library'

const MODALITIES = ['CMR', 'CT', 'PET', 'ECHO'] as const

const SAMPLE = JSON.stringify(
  { id: 'sequence_code', name: 'Sequence name', sections: [{ id: 'section_1', name: 'Section 1', fields: [] }] },
  null,
  2,
)

export function BlockDialog() {
  const t = useTranslations('corelab.library')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [block, setBlock] = useState({ code: '', name: '', kind: 'SEQUENCE', modality: 'CMR', definition: SAMPLE })

  const save = useAction(saveBlockAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      setOpen(false)
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  function submit() {
    try {
      const definition: unknown = JSON.parse(block.definition)
      save.execute({
        code: block.code.trim(),
        name: block.name.trim(),
        kind: block.kind === 'SECTION' ? 'SECTION' : 'SEQUENCE',
        modality: block.modality as (typeof MODALITIES)[number],
        definition,
      })
    } catch {
      toast.error(t('invalidJson'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t('newBlock')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('newBlock')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="block-code">{t('code')}</Label>
              <Input id="block-code" value={block.code} onChange={(event) => setBlock({ ...block, code: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-name">{t('name')}</Label>
              <Input id="block-name" value={block.name} onChange={(event) => setBlock({ ...block, name: event.target.value })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="block-kind">{t('kind')}</Label>
              <SingleSelect
                options={(['SEQUENCE', 'SECTION'] as const).map((kind) => ({ value: kind, label: t(`kinds.${kind}`) }))}
                value={block.kind}
                onChange={(value) => setBlock({ ...block, kind: value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-modality">{t('modality')}</Label>
              <SingleSelect
                options={MODALITIES.map((modality) => ({ value: modality, label: modality }))}
                value={block.modality}
                onChange={(value) => setBlock({ ...block, modality: value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="block-definition">{t('blockDefinition')}</Label>
            <Textarea
              id="block-definition"
              rows={10}
              className="font-mono text-xs"
              value={block.definition}
              onChange={(event) => setBlock({ ...block, definition: event.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}>{t('save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
