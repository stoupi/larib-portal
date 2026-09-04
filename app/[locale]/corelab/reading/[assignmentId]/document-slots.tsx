'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { importWorkbookAction, registerReadingDocumentAction } from '../../actions-reading'
import type { DocumentSlot } from '@/lib/corelab/crf/schema'

type ReadingDocument = { id: string; examId: string | null; slotKey: string; fileName: string; status: string }

type DocumentSlotsProps = {
  context: { assignmentId: string; examId: string; readOnly: boolean }
  slots: DocumentSlot[]
  documents: ReadingDocument[]
}

const STATUS_STYLE: Record<string, string> = {
  CONFORMANT: 'text-emerald-700',
  PENDING: 'text-text-secondary',
  MISSING: 'text-red-600',
  REJECTED: 'text-red-600',
}

export function DocumentSlots({ context, slots, documents }: DocumentSlotsProps) {
  const t = useTranslations('corelab.reading')
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const register = useAction(registerReadingDocumentAction, {
    onSuccess: () => {
      setBusy(false)
      router.refresh()
    },
    onError: () => {
      toast.error(t('error'))
      setBusy(false)
    },
  })

  const runImport = useAction(importWorkbookAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      toast.success(t('imported', { count: data.imported }))
      if (data.keptBecauseModified > 0) toast.info(t('importKept', { count: data.keptBecauseModified }))
      router.refresh()
    },
    onError: () => toast.error(t('importFailed')),
  })

  const SERVER_UPLOAD_MAX_BYTES = 4 * 1024 * 1024

  async function uploadThroughServer(slot: DocumentSlot, file: File): Promise<string | null> {
    const body = new FormData()
    body.append('file', file)
    body.append('assignmentId', context.assignmentId)
    body.append('slotKey', slot.id)
    const response = await fetch('/api/corelab/uploads/reading-document', { method: 'POST', body })
    if (!response.ok) return null
    return ((await response.json()) as { key: string }).key
  }

  async function uploadDirectly(slot: DocumentSlot, file: File): Promise<string | null> {
    const response = await fetch('/api/corelab/uploads/reading-document-signed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId: context.assignmentId,
        slotKey: slot.id,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
      }),
    })
    if (!response.ok) return null
    const { uploadUrl, key } = (await response.json()) as { uploadUrl: string; key: string }
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    })
    return put.ok ? key : null
  }

  async function upload(slot: DocumentSlot, file: File) {
    setBusy(true)
    const key = file.size <= SERVER_UPLOAD_MAX_BYTES
      ? await uploadThroughServer(slot, file)
      : await uploadDirectly(slot, file)
    if (!key) {
      toast.error(t('error'))
      setBusy(false)
      return
    }
    register.execute({
      assignmentId: context.assignmentId,
      examId: context.examId,
      slotKey: slot.id,
      key,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
    })
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-text-primary">{t('documents')}</h3>
      {slots.map((slot) => {
        const document = documents.find(
          (candidate) => candidate.slotKey === slot.id && (candidate.examId === null || candidate.examId === context.examId),
        )
        return (
          <div key={slot.id} className="space-y-1" data-testid={`slot-${slot.id}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-text-primary">{slot.label}</span>
              <span className="text-[11px] text-text-secondary">{slot.required ? t('slotRequired') : t('slotOptional')}</span>
            </div>
            {document ? (
              <p className="text-xs">
                <span className="text-text-secondary">{document.fileName}</span>
                <span className={`ml-2 ${STATUS_STYLE[document.status] ?? ''}`}>{t(`documentStatus.${document.status}`)}</span>
              </p>
            ) : (
              <p className="text-xs text-text-secondary">{t('slotAccept', { accept: slot.accept })}</p>
            )}

            {context.readOnly ? null : (
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm" disabled={busy}>
                  <label className="cursor-pointer">
                    {document ? t('replace') : t('upload')}
                    <input
                      type="file"
                      className="hidden"
                      accept={slot.accept}
                      aria-label={slot.label}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void upload(slot, file)
                      }}
                    />
                  </label>
                </Button>
                {document && slot.onUpload === 'import' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={runImport.isPending}
                    onClick={() => runImport.execute({
                      assignmentId: context.assignmentId,
                      documentId: document.id,
                      examId: context.examId,
                    })}
                  >
                    {t('import')}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
