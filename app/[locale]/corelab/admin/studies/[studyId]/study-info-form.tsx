'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateStudyInfoAction } from '../../actions'

const FormSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim(),
  reviewDeadlineDays: z.coerce.number().int().min(1).max(90),
  maxExamsPerPatient: z.coerce.number().int().min(1).max(6),
})

type FormValues = z.input<typeof FormSchema>

type StudyInfoFormProps = {
  studyId: string
  code: string
  initial: { name: string; description: string; reviewDeadlineDays: number; maxExamsPerPatient: number }
}

export function StudyInfoForm({ studyId, code, initial }: StudyInfoFormProps) {
  const t = useTranslations('corelab.config')
  const router = useRouter()
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: initial })

  const action = useAction(updateStudyInfoAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <h2 className="text-lg font-semibold text-text-primary">{t('infoTitle')}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t('infoSubtitle')}</p>
      <form
        className="mt-5 space-y-4"
        onSubmit={form.handleSubmit((values) =>
          action.execute({
            studyId,
            name: values.name,
            description: values.description,
            reviewDeadlineDays: Number(values.reviewDeadlineDays),
            maxExamsPerPatient: Number(values.maxExamsPerPatient),
          }),
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="info-name">{t('name')}</Label>
            <Input id="info-name" {...form.register('name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="info-code">{t('code')}</Label>
            <Input id="info-code" value={code} readOnly disabled />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="info-description">{t('description')}</Label>
          <Textarea id="info-description" rows={3} {...form.register('description')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="info-deadline">{t('reviewDeadline')}</Label>
            <Input id="info-deadline" type="number" min={1} max={90} {...form.register('reviewDeadlineDays')} />
            <p className="text-xs text-text-secondary">{t('reviewDeadlineHelp')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="info-max-exams">{t('maxExams')}</Label>
            <Input id="info-max-exams" type="number" min={1} max={6} {...form.register('maxExamsPerPatient')} />
          </div>
        </div>
        <Button type="submit" disabled={action.isPending}>{t('save')}</Button>
      </form>
    </section>
  )
}
