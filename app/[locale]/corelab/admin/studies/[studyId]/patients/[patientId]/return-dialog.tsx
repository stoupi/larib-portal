'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { returnForDocumentsAction } from '../../../../actions-return'
import type { DocumentSlot } from '@/lib/corelab/crf/schema'

export function ReturnDialog({ studyId, patientId, slots }: { studyId: string; patientId: string; slots: DocumentSlot[] }) {
  const t = useTranslations('corelab.reading.admin')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [slotKeys, setSlotKeys] = useState<string[]>([])

  const action = useAction(returnForDocumentsAction, {
    onSuccess: () => {
      toast.success(t('returnSent'))
      setOpen(false)
      setMessage('')
      setSlotKeys([])
      router.refresh()
    },
    onError: () => toast.error(t('returnSend')),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t('return')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('returnTitle')}</DialogTitle>
          <DialogDescription>{t('returnHelp')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {slots.map((slot) => (
              <label key={slot.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={slotKeys.includes(slot.id)}
                  onCheckedChange={(next) =>
                    setSlotKeys((current) => (next === true ? [...current, slot.id] : current.filter((key) => key !== slot.id)))
                  }
                />
                {slot.label}
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="return-message">{t('returnMessage')}</Label>
            <Textarea id="return-message" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={slotKeys.length === 0 || message.trim().length < 3 || action.isPending}
            onClick={() => action.execute({ studyId, patientId, message: message.trim(), slotKeys })}
          >
            {t('returnSend')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
