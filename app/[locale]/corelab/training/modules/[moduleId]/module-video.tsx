'use client'

import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { completeVideoAction } from '../../../actions-training'

type ModuleVideoProps = {
  studyId: string
  moduleId: string
  videoUrl: string | null
  completed: boolean
}

export function ModuleVideo({ studyId, moduleId, videoUrl, completed }: ModuleVideoProps) {
  const t = useTranslations('corelab.training')
  const router = useRouter()

  const action = useAction(completeVideoAction, {
    onSuccess: ({ data }) => {
      toast.success(data?.unlocked ? t('unlocked') : t('marked'))
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  return (
    <div className="space-y-4">
      {videoUrl ? (
        <video
          controls
          controlsList="nodownload"
          src={videoUrl}
          className="w-full rounded-xl border border-border bg-black"
        />
      ) : (
        <p className="text-sm text-text-secondary">{t('videoMissing')}</p>
      )}
      <Button disabled={action.isPending || completed} onClick={() => action.execute({ studyId, moduleId })}>
        {completed ? t('state.done') : t('markDone')}
      </Button>
    </div>
  )
}
