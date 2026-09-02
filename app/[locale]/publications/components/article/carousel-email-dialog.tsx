'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { renderCarouselRequestEmailHtml } from '@/lib/email/carousel-template'
import { prepareCarouselEmailAction, sendCarouselEmailAction } from '../../actions'

const CORAL_BUTTON =
  'gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105'

type CarouselEmailDraftState = {
  to: string
  cc: string[]
  subject: string
  body: string
  missingFirstAuthorEmail: boolean
}

export function useCarouselEmailDialog() {
  const t = useTranslations('publications')
  const [articleId, setArticleId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CarouselEmailDraftState | null>(null)

  const prepare = useAction(prepareCarouselEmailAction, {
    onSuccess({ data }) {
      if (!data) return
      setDraft({
        to: data.draft.to,
        cc: [...data.draft.cc],
        subject: data.draft.subject,
        body: data.draft.body,
        missingFirstAuthorEmail: data.missingFirstAuthorEmail,
      })
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  function openFor(nextArticleId: string) {
    setArticleId(nextArticleId)
    setDraft(null)
    prepare.execute({ articleId: nextArticleId })
  }

  function close() {
    setArticleId(null)
    setDraft(null)
  }

  function updateDraft(patch: Partial<CarouselEmailDraftState>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  return { articleId, draft, loading: prepare.isPending, openFor, close, updateDraft }
}

export type CarouselEmailController = ReturnType<typeof useCarouselEmailDialog>

export function CarouselEmailDialog({ controller }: { controller: CarouselEmailController }) {
  const t = useTranslations('publications.carouselEmail')
  const router = useRouter()
  const { articleId, draft, loading, close, updateDraft } = controller

  const send = useAction(sendCarouselEmailAction, {
    onSuccess() {
      toast.success(t('sentToast'))
      close()
      router.refresh()
    },
    onError() {
      toast.error(t('errorToast'))
    },
  })

  const canSend = Boolean(articleId && draft && draft.to.trim() && draft.subject.trim() && draft.body.trim())

  return (
    <Dialog
      open={articleId !== null}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>

        {draft && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="carousel-email-to">{t('toLabel')}</Label>
              <Input
                id="carousel-email-to"
                type="email"
                value={draft.to}
                onChange={(event) => updateDraft({ to: event.target.value })}
              />
              {draft.missingFirstAuthorEmail && (
                <p className="text-xs font-semibold text-[#B45309] dark:text-[#FBBF24]">{t('missingEmail')}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t('ccLabel')}</Label>
              <p className="break-words text-sm text-text-secondary">{draft.cc.join(', ')}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="carousel-email-subject">{t('subjectLabel')}</Label>
              <Input
                id="carousel-email-subject"
                value={draft.subject}
                onChange={(event) => updateDraft({ subject: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="carousel-email-body">{t('bodyLabel')}</Label>
              <Tabs defaultValue="edit">
                <TabsList>
                  <TabsTrigger value="edit">{t('tabEdit')}</TabsTrigger>
                  <TabsTrigger value="preview">{t('tabPreview')}</TabsTrigger>
                </TabsList>
                <TabsContent value="edit">
                  <Textarea
                    id="carousel-email-body"
                    rows={18}
                    value={draft.body}
                    onChange={(event) => updateDraft({ body: event.target.value })}
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <iframe
                    title={t('tabPreview')}
                    sandbox=""
                    srcDoc={renderCarouselRequestEmailHtml(draft.body, draft.subject)}
                    className="h-[420px] w-full rounded-lg border border-line bg-white"
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            className={CORAL_BUTTON}
            disabled={!canSend || loading || send.isPending}
            onClick={() => {
              if (!articleId || !draft) return
              send.execute({
                articleId,
                to: draft.to.trim(),
                subject: draft.subject.trim(),
                body: draft.body,
              })
            }}
          >
            <Send className="h-4 w-4" />
            {t('send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
