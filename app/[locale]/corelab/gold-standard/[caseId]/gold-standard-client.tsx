'use client'

import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { CalibrationEditor } from '../../components/crf/calibration-editor'
import { saveGoldStandardAction, signGoldStandardAction } from '../../actions-calibration'
import type { CrfDefinition } from '@/lib/corelab/crf/schema'
import type { ReadingValues } from '@/types/corelab'

type GoldStandardClientProps = {
  context: { studyId: string; caseId: string; caseCode: string; readOnly: boolean }
  definition: CrfDefinition
  exams: Array<{ id: string; label: string }>
  initialValues: ReadingValues
}

export function GoldStandardClient({ context, definition, exams, initialValues }: GoldStandardClientProps) {
  const t = useTranslations('corelab.calibration')
  const router = useRouter()

  const save = useAction(saveGoldStandardAction, { onError: () => toast.error(t('error')) })
  const sign = useAction(signGoldStandardAction, {
    onSuccess: () => {
      toast.success(t('goldValidated'))
      router.refresh()
    },
    onError: ({ error }) => toast.error(error.serverError === 'INVALID_PASSWORD' ? t('error') : t('error')),
  })

  return (
    <CalibrationEditor
      context={{
        studyId: context.studyId,
        caseCode: context.caseCode,
        backHref: `/corelab/admin/studies/${context.studyId}/calibration`,
        title: t('goldTitle', { code: context.caseCode }),
        subtitle: t('adminTitle'),
        hideSegments: true,
        readOnly: context.readOnly,
      }}
      definition={definition}
      exams={exams}
      initialValues={initialValues}
      handlers={{
        signLabel: t('validateGold'),
        onSave: (examId, values) => save.execute({ studyId: context.studyId, caseId: context.caseId, examId, values }),
        onSign: ({ password, reason }) => sign.execute({ studyId: context.studyId, caseId: context.caseId, password, reason }),
      }}
    />
  )
}
