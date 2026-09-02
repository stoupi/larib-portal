'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { BellOff, BellRing, Eye, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/ui/tag-input'
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { previewRecapAction, sendRecapAction, setRecapCopyRecipientsAction, setRecapOptOutAction } from '../../actions'
import type { RecapAudienceMember } from '@/lib/services/publications/recap'

type Preview = { name: string; userId: string; subject?: string; html?: string; nothingToSay: boolean }

function memberName(member: RecapAudienceMember): string {
  return [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email
}

export function RecapAudience({
  members,
  copyRecipients,
}: {
  members: RecapAudienceMember[]
  copyRecipients: string[]
}) {
  const t = useTranslations('publications.emails')
  const locale = useLocale()
  const router = useRouter()
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const [copies, setCopies] = useState(copyRecipients)
  const [preview, setPreview] = useState<Preview | null>(null)

  const saveCopies = useAction(setRecapCopyRecipientsAction, {
    onSuccess() {
      toast.success(t('ccSaved'))
      router.refresh()
    },
    onError: () => toast.error(t('actionError')),
  })

  const toggleOptOut = useAction(setRecapOptOutAction, {
    onSuccess() {
      toast.success(t('optOutSaved'))
      router.refresh()
    },
    onError: () => toast.error(t('actionError')),
  })

  const loadPreview = useAction(previewRecapAction, {
    onError: () => toast.error(t('actionError')),
  })

  const send = useAction(sendRecapAction, {
    onSuccess({ data }) {
      toast.success(data?.outcome === 'nothingToSay' ? t('nothingToSay') : t('sent'))
      setPreview(null)
      router.refresh()
    },
    onError: () => toast.error(t('actionError')),
  })

  async function openPreview(member: RecapAudienceMember) {
    const result = await loadPreview.executeAsync({ userId: member.id })
    const data = result?.data
    setPreview({
      name: memberName(member),
      userId: member.id,
      nothingToSay: !data || 'nothingToSay' in data,
      subject: data && 'subject' in data ? data.subject : undefined,
      html: data && 'html' in data ? data.html : undefined,
    })
  }

  return (
    <section aria-label={t('audienceTitle')} className="space-y-4">
      <header>
        <h2 className="text-xl font-extrabold tracking-tight text-text-primary">{t('audienceTitle')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('audienceSubtitle')}</p>
      </header>

      <div className="rounded-2xl border border-line bg-bg-surface p-5">
        <p className="text-sm font-semibold text-text-primary">{t('ccTitle')}</p>
        <p className="mt-0.5 text-xs text-text-muted">{t('ccHint')}</p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[280px] flex-1">
            <TagInput value={copies} onChange={setCopies} placeholder="nom@hopital.fr" />
          </div>
          <Button
            type="button"
            className="gap-2"
            disabled={saveCopies.isExecuting}
            onClick={() => saveCopies.execute({ emails: copies })}
          >
            <Save className="size-4" strokeWidth={2.2} />
            {t('ccSave')}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-bg-surface">
        <table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>{t('colMember')}</TableHead>
              <TableHead>{t('colLastRecap')}</TableHead>
              <TableHead>{t('colSending')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <span className="block font-semibold text-text-primary">{memberName(member)}</span>
                  <span className="block text-xs text-text-secondary">{member.email}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums text-text-secondary">
                  {member.lastRecapAt ? formatter.format(new Date(member.lastRecapAt)) : t('never')}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      member.optedOut
                        ? 'inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-text-muted'
                        : 'inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-[#047857] dark:text-[#6EE7B7]'
                    }
                  >
                    {member.optedOut ? <BellOff className="size-4" /> : <BellRing className="size-4" />}
                    {member.optedOut ? t('optedOut') : t('optedIn')}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <div className="inline-flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={loadPreview.isExecuting}
                      onClick={() => openPreview(member)}
                    >
                      <Eye className="size-3.5" strokeWidth={2.2} />
                      {t('previewAndSend')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={toggleOptOut.isExecuting}
                      onClick={() => toggleOptOut.execute({ userId: member.id, optedOut: !member.optedOut })}
                    >
                      {member.optedOut ? <BellRing className="size-3.5" /> : <BellOff className="size-3.5" />}
                      {member.optedOut ? t('resume') : t('suspend')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t('previewTitle', { name: preview?.name ?? '' })}</DialogTitle>
            <DialogDescription>{preview?.subject ?? ''}</DialogDescription>
          </DialogHeader>
          {preview?.nothingToSay ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-text-muted">
              {t('nothingToSay')}
            </p>
          ) : (
            <iframe
              title={t('previewAndSend')}
              sandbox=""
              srcDoc={preview?.html ?? ''}
              className="h-[520px] w-full rounded-xl border border-line bg-white"
            />
          )}
          <DialogFooter>
            <Button
              type="button"
              className="gap-2"
              disabled={preview?.nothingToSay || send.isExecuting}
              onClick={() => preview && send.execute({ userId: preview.userId })}
            >
              <Send className="size-4" strokeWidth={2.2} />
              {t('sendNow')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
