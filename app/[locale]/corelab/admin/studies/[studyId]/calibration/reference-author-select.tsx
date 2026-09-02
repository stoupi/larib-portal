'use client'

import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { SingleSelect } from '@/components/ui/single-select'
import { setReferenceAuthorAction } from '../../../actions-calibration'

type ReferenceAuthorSelectProps = {
  studyId: string
  caseId: string
  value: string | null
  authors: Array<{ value: string; label: string }>
  disabled: boolean
}

export function ReferenceAuthorSelect({ studyId, caseId, value, authors, disabled }: ReferenceAuthorSelectProps) {
  const t = useTranslations('corelab.capability')
  const router = useRouter()

  const action = useAction(setReferenceAuthorAction, {
    onSuccess: () => router.refresh(),
    onError: () => toast.error(t('unassigned')),
  })

  return (
    <SingleSelect
      className="w-56"
      disabled={disabled}
      placeholder={t('unassigned')}
      options={authors}
      value={value ?? ''}
      onChange={(next) => action.execute({ studyId, caseId, userId: next === '' ? null : next })}
    />
  )
}
