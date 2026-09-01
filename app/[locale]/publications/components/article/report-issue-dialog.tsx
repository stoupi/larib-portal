'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { reportPublicationIssueAction } from '../../actions'

export function ReportIssueDialog({ articleId }: { articleId: string }) {
  const t = useTranslations('publications.editor')
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  const report = useAction(reportPublicationIssueAction, {
    onSuccess({ data }) {
      toast.success(data?.firstAuthorReached ? t('reportIssueSent') : t('reportIssueSentAdminsOnly'))
      setMessage('')
      setOpen(false)
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="mt-4 w-full gap-2">
          <AlertTriangle className="h-4 w-4" strokeWidth={2.2} />
          {t('reportIssue')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reportIssueTitle')}</DialogTitle>
          <DialogDescription>{t('reportIssueHint')}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          placeholder={t('reportIssuePlaceholder')}
          aria-label={t('reportIssueTitle')}
        />
        <DialogFooter>
          <Button
            type="button"
            disabled={message.trim() === '' || report.isExecuting}
            onClick={() => report.execute({ articleId, message: message.trim() })}
          >
            {t('reportIssueSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
