'use client'

import { useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Eye, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/ui/tag-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  previewAcceptedRecapAction,
  sendAcceptedRecapAction,
  setAcceptedRecapRecipientsAction,
} from '../../actions'

type Preview = { subject?: string; html?: string; since?: string; papers?: number; nothingToSay: boolean }

export function AcceptedRecapSection({ recipients }: { recipients: string[] }) {
  const t = useTranslations('publications.emails')
  const locale = useLocale()
  const router = useRouter()
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'long' })
  const [emails, setEmails] = useState(recipients)
  const [preview, setPreview] = useState<Preview | null>(null)

  const queued = useRef<string[] | null>(null)

  const save = useAction(setAcceptedRecapRecipientsAction, {
    onSuccess() {
      const next = queued.current
      if (next) {
        queued.current = null
        save.execute({ emails: next })
        return
      }
      toast.success(t('acceptedSaved'))
      router.refresh()
    },
    onError: () => {
      queued.current = null
      toast.error(t('actionError'))
    },
  })

  function persist(next: string[]) {
    setEmails(next)
    if (save.isExecuting) {
      queued.current = next
      return
    }
    save.execute({ emails: next })
  }

  const loadPreview = useAction(previewAcceptedRecapAction, {
    onError: () => toast.error(t('actionError')),
  })

  const send = useAction(sendAcceptedRecapAction, {
    onSuccess({ data }) {
      toast.success(
        data?.outcome === 'nothingToSay' ? t('acceptedNothing') : t('acceptedSent', { count: data?.sent ?? 0 }),
      )
      setPreview(null)
      router.refresh()
    },
    onError: () => toast.error(t('actionError')),
  })

  async function openPreview() {
    const result = await loadPreview.executeAsync({})
    const data = result?.data
    setPreview({
      nothingToSay: !data || 'nothingToSay' in data,
      subject: data && 'subject' in data ? data.subject : undefined,
      html: data && 'html' in data ? data.html : undefined,
      since: data && 'since' in data ? data.since : undefined,
      papers: data && 'papers' in data ? data.papers : undefined,
    })
  }

  return (
    <section aria-label={t('acceptedTitle')} className="space-y-4">
      <header>
        <h2 className="text-xl font-extrabold tracking-tight text-text-primary">{t('acceptedTitle')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('acceptedSubtitle')}</p>
      </header>

      <div className="rounded-2xl border border-line bg-bg-surface p-5">
        <p className="text-sm font-semibold text-text-primary">{t('acceptedListTitle')}</p>
        <p className="mt-0.5 text-xs text-text-muted">{t('acceptedListHint')}</p>
        <div className="mt-3">
          <TagInput value={emails} onChange={persist} placeholder="nom@hopital.fr" />
        </div>
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={loadPreview.isExecuting}
            onClick={openPreview}
          >
            <Eye className="size-3.5" strokeWidth={2.2} />
            {t('acceptedPreview')}
          </Button>
        </div>
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t('acceptedPreviewTitle')}</DialogTitle>
            <DialogDescription>
              {preview?.since
                ? t('acceptedWindow', {
                    count: preview.papers ?? 0,
                    since: formatter.format(new Date(preview.since)),
                  })
                : (preview?.subject ?? '')}
            </DialogDescription>
          </DialogHeader>
          {preview?.nothingToSay ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-text-muted">
              {t('acceptedNothing')}
            </p>
          ) : (
            <iframe
              title={t('acceptedPreviewTitle')}
              sandbox=""
              srcDoc={preview?.html ?? ''}
              className="h-[520px] w-full rounded-xl border border-line bg-white"
            />
          )}
          <DialogFooter>
            <Button
              type="button"
              className="gap-2"
              disabled={preview?.nothingToSay || emails.length === 0 || send.isExecuting}
              onClick={() => send.execute({})}
            >
              <Send className="size-4" strokeWidth={2.2} />
              {emails.length === 0 ? t('acceptedNoRecipient') : t('acceptedSendNow')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
