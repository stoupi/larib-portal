'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { MailSourceView } from '@/lib/services/publications/mail-suggestions'

export function MailDialog({ sources }: { sources: MailSourceView[] }) {
  const t = useTranslations('publications.mailAgent')
  const locale = useLocale()
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Mail className="size-4" />
          {t('readMail')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sources[0]?.subject}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {sources.map((source) => (
            <article key={source.id} className="space-y-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
              <p className="text-base text-text-primary">
                <span className="font-semibold">{source.sender}</span> · {formatter.format(new Date(source.receivedAt))}
              </p>
              <p className="whitespace-pre-wrap text-base leading-relaxed text-text-primary">
                {source.body ?? t('mailBodyMissing')}
              </p>
              {source.threadUrl && (
                <a
                  href={source.threadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-base font-semibold text-coral-600 underline-offset-4 hover:underline"
                >
                  {t('openInGmail')}
                </a>
              )}
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
