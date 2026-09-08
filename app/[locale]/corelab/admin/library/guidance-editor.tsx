'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { guidanceImageUrl } from '@/lib/corelab/library/guidance'
import { ChoiceChip } from './inspector-controls'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

type Guidance = NonNullable<FieldDefinition['guidance']>

export function GuidanceEditor({ guidance, onChange }: { guidance: Guidance | undefined; onChange: (next: Guidance | undefined) => void }) {
  const t = useTranslations('corelab.library.inspector')
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  function setLevel(level: Guidance['level'] | null) {
    if (level === null) return onChange(undefined)
    onChange({ level, text: guidance?.text ?? '', ...(guidance?.imageKey ? { imageKey: guidance.imageKey } : {}) })
  }

  async function upload(file: File) {
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/corelab/uploads/library-guidance', { method: 'POST', body })
      if (!response.ok) throw new Error((await response.json()).error ?? 'upload_failed')
      const { key } = (await response.json()) as { key: string }
      onChange({ level: guidance?.level ?? 'INFO', text: guidance?.text ?? '', imageKey: key })
    } catch (error) {
      toast.error(t(error instanceof Error && error.message === 'file_too_large' ? 'imageTooLarge' : 'imageFailed'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        <ChoiceChip label={t('guidanceNone')} selected={!guidance} onClick={() => setLevel(null)} />
        <ChoiceChip label={t('guidanceInfo')} selected={guidance?.level === 'INFO'} onClick={() => setLevel('INFO')} />
        <ChoiceChip label={t('guidanceWarning')} selected={guidance?.level === 'WARNING'} onClick={() => setLevel('WARNING')} />
      </div>

      {guidance ? (
        <div className="rounded-[10px] border border-gray-100 bg-gray-25 p-3">
          <Textarea
            rows={3}
            value={guidance.text}
            aria-label={t('guidanceText')}
            placeholder={t('guidancePlaceholder')}
            onChange={(event) => onChange({ ...guidance, text: event.target.value })}
          />

          {guidance.imageKey ? (
            <div className="mt-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={guidanceImageUrl(guidance.imageKey)}
                alt={t('guidanceImage')}
                className="max-h-40 w-full rounded-md border border-line bg-white object-contain"
              />
              <Button
                variant="ghost" size="sm" className="mt-1 gap-1.5 text-text-secondary"
                onClick={() => onChange({ level: guidance.level, text: guidance.text })}
              >
                <Trash2 className="size-4" />
                {t('guidanceRemoveImage')}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline" size="sm" className="mt-2.5 gap-1.5"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              <ImagePlus className="size-4" />
              {uploading ? t('guidanceUploading') : t('guidanceAddImage')}
            </Button>
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void upload(file)
            }}
          />

          <p className="mt-2 text-xs leading-relaxed text-text-muted">{t('guidanceHint')}</p>
        </div>
      ) : null}
    </>
  )
}
