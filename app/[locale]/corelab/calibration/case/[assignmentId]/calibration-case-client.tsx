'use client'

import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { CalibrationEditor } from '../../../components/crf/calibration-editor'
import { saveCalibrationValuesAction, submitCalibrationCaseAction } from '../../../actions-calibration'
import type { CrfDefinition } from '@/lib/corelab/crf/schema'
import type { ReadingValues } from '@/types/corelab'

type CalibrationCaseClientProps = {
  context: { studyId: string; assignmentId: string; caseCode: string; readOnly: boolean }
  definition: CrfDefinition
  exams: Array<{ id: string; label: string }>
  initialValues: ReadingValues
}

export function CalibrationCaseClient({ context, definition, exams, initialValues }: CalibrationCaseClientProps) {
  const t = useTranslations('corelab.calibration')
  const router = useRouter()

  const save = useAction(saveCalibrationValuesAction, { onError: () => toast.error(t('error')) })
  const submit = useAction(submitCalibrationCaseAction, {
    onSuccess: () => {
      toast.success(t('submitted'))
      router.push(`/corelab/studies/${context.studyId}/calibration`)
      router.refresh()
    },
    onError: ({ error }) => toast.error(error.serverError === 'INVALID_PASSWORD' ? t('error') : t('error')),
  })

  return (
    <CalibrationEditor
      context={{
        studyId: context.studyId,
        caseCode: context.caseCode,
        backHref: `/corelab/studies/${context.studyId}/calibration`,
        title: t('caseTitle', { code: context.caseCode }),
        subtitle: t('reader_.subtitle'),
        hideSegments: false,
        readOnly: context.readOnly,
      }}
      definition={definition}
      exams={exams}
      initialValues={initialValues}
      handlers={{
        signLabel: t('submit'),
        onSave: (examId, values) => save.execute({ studyId: context.studyId, assignmentId: context.assignmentId, examId, values }),
        onSign: ({ password, reason }) => submit.execute({ studyId: context.studyId, assignmentId: context.assignmentId, password, reason }),
      }}
    />
  )
}
