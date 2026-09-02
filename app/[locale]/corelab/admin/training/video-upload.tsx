'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { setModuleVideoAction } from '../actions-training'

export function VideoUpload({ moduleId }: { moduleId: string }) {
  const t = useTranslations('corelab.training.admin')
  const router = useRouter()
  const [percent, setPercent] = useState<number | null>(null)

  const action = useAction(setModuleVideoAction, {
    onSuccess: () => {
      toast.success(t('videoSet'))
      setPercent(null)
      router.refresh()
    },
    onError: () => {
      toast.error(t('save'))
      setPercent(null)
    },
  })

  async function upload(file: File) {
    setPercent(0)
    const response = await fetch('/api/corelab/uploads/training-video-signed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId, filename: file.name, contentType: file.type, size: file.size }),
    })
    if (!response.ok) {
      toast.error(t('save'))
      setPercent(null)
      return
    }
    const { uploadUrl, key } = (await response.json()) as { uploadUrl: string; key: string }

    const request = new XMLHttpRequest()
    request.open('PUT', uploadUrl)
    request.setRequestHeader('Content-Type', file.type)
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setPercent(Math.round((event.loaded / event.total) * 100))
    }
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        action.execute({ moduleId, key, mimeType: file.type, size: file.size })
        return
      }
      toast.error(t('save'))
      setPercent(null)
    }
    request.onerror = () => {
      toast.error(t('save'))
      setPercent(null)
    }
    request.send(file)
  }

  return (
    <div className="flex items-center gap-3">
      <Button asChild variant="outline" size="sm">
        <label className="cursor-pointer">
          {t('uploadVideo')}
          <input
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
            }}
          />
        </label>
      </Button>
      {percent !== null ? <span className="text-xs text-text-secondary">{t('uploading', { percent })}</span> : null}
    </div>
  )
}
