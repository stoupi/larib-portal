'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { FileText, Upload, Trash2, ExternalLink } from 'lucide-react'
import { CollapsibleCard } from './collapsible-card'
import { saveArticlePdfAction, removeArticlePdfAction } from '../../actions'

const MAX_PDF_BYTES = 30 * 1024 * 1024

export function EditorPdf({ articleId, pdfUrl, editable }: { articleId: string; pdfUrl: string | null; editable: boolean }) {
  const t = useTranslations('publications.editor.pdf')
  const tActions = useTranslations('publications.editor')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const save = useAction(saveArticlePdfAction, {
    onSuccess() {
      toast.success(t('saved'))
      router.refresh()
    },
    onError() {
      toast.error(tActions('actionError'))
    },
  })

  const remove = useAction(removeArticlePdfAction, {
    onSuccess() {
      toast.success(t('removed'))
      router.refresh()
    },
    onError() {
      toast.error(tActions('actionError'))
    },
  })

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error(t('invalidType'))
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      toast.error(t('tooLarge'))
      return
    }

    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('articleId', articleId)
      const response = await fetch('/api/uploads/publication-pdf', { method: 'POST', body })
      if (!response.ok) throw new Error('upload_failed')
      const uploaded = (await response.json()) as { url: string; key: string }
      save.execute({ id: articleId, url: uploaded.url, key: uploaded.key })
    } catch {
      toast.error(t('uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const busy = uploading || save.isExecuting || remove.isExecuting

  return (
    <CollapsibleCard
      title={
        <>
          <FileText className="h-4 w-4 text-coral-500" strokeWidth={2} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-coral-600">{t('title')}</h2>
        </>
      }
    >
      <div className="space-y-3">
        {pdfUrl ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3.5">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-navy-600 underline-offset-4 hover:underline dark:text-navy-300"
            >
              <FileText className="h-4 w-4 shrink-0" strokeWidth={2.2} />
              <span className="truncate">{t('open')}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            </a>
            {editable && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-text-secondary transition hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/5"
                >
                  <Upload className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {t('replace')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove.execute({ id: articleId })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-white/5"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {t('remove')}
                </button>
              </div>
            )}
          </div>
        ) : editable ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-coral-200 bg-coral-50/40 px-4 py-8 text-center transition hover:bg-coral-50 disabled:opacity-50 dark:border-coral-500/30 dark:bg-coral-500/[0.05]"
          >
            <Upload className="h-5 w-5 text-coral-600" strokeWidth={2.2} />
            <span className="text-sm font-bold text-text-primary">{uploading ? t('uploading') : t('select')}</span>
            <span className="text-xs text-text-secondary">{t('hint')}</span>
          </button>
        ) : (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-text-muted">{t('none')}</p>
        )}
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={onFileChange} />
      </div>
    </CollapsibleCard>
  )
}
