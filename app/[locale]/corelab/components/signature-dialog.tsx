'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type SignatureDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  summary: ReactNode
  onConfirm: (input: { password: string; reason: string }) => void
}

export function SignatureDialog({ open, onOpenChange, title, summary, onConfirm }: SignatureDialogProps) {
  const t = useTranslations('corelab.signature')
  const [password, setPassword] = useState('')
  const [reason, setReason] = useState('')

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPassword('')
      setReason('')
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t('hint')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-neutral-50 p-3 text-sm text-text-secondary">{summary}</div>
          <div className="space-y-2">
            <Label htmlFor="signature-reason">{t('reason')}</Label>
            <Input
              id="signature-reason"
              value={reason}
              placeholder={t('reasonPlaceholder')}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signature-password">{t('password')}</Label>
            <Input
              id="signature-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>{t('cancel')}</Button>
          <Button
            disabled={password.length === 0 || reason.trim().length < 3}
            onClick={() => onConfirm({ password, reason: reason.trim() })}
          >
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
