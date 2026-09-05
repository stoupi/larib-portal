'use client'

import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { studyDocumentUrlAction } from '../actions-reading'
import { readingDocumentUrlAction } from '../admin/actions'

type DownloadButtonProps = {
  studyId: string
  documentId: string
  kind: 'STUDY' | 'READING'
}

export function DownloadButton({ studyId, documentId, kind }: DownloadButtonProps) {
  const t = useTranslations('corelab.reading.studyDocuments')
  const open = ({ data }: { data?: { url: string } }) => {
    if (data?.url) window.open(data.url, '_blank', 'noopener')
  }
  const study = useAction(studyDocumentUrlAction, { onSuccess: open, onError: () => toast.error(t('uploadFailed')) })
  const reading = useAction(readingDocumentUrlAction, { onSuccess: open, onError: () => toast.error(t('uploadFailed')) })

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => (kind === 'STUDY' ? study : reading).execute({ studyId, documentId })}
    >
      <Download className="mr-2 h-4 w-4" />
      {t('download')}
    </Button>
  )
}
