'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addStudyDocumentAction } from '../../../actions'

export function StudyDocumentUpload({ studyId }: { studyId: string }) {
  const t = useTranslations('corelab.reading.studyDocuments')
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  const add = useAction(addStudyDocumentAction, {
    onSuccess: () => {
      toast.success(t('added'))
      setTitle('')
      setBusy(false)
      router.refresh()
    },
    onError: () => {
      toast.error(t('uploadFailed'))
      setBusy(false)
    },
  })

  async function upload(file: File) {
    setBusy(true)
    const form = new FormData()
    form.append('file', file)
    form.append('studyId', studyId)
    const response = await fetch('/api/corelab/uploads/study-document', { method: 'POST', body: form })
    if (!response.ok) {
      toast.error(t('uploadFailed'))
      setBusy(false)
      return
    }
    const uploaded: { key: string; fileName: string } = await response.json()
    add.execute({ studyId, title: title.trim() || uploaded.fileName, key: uploaded.key, fileName: uploaded.fileName })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="document-title">{t('titleLabel')}</Label>
        <Input id="document-title" value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="document-file">{t('file')}</Label>
        <Input
          id="document-file"
          type="file"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void upload(file)
          }}
        />
      </div>
    </div>
  )
}
