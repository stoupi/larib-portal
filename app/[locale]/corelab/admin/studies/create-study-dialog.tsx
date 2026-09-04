'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createStudyAction } from '../actions'

const FormSchema = z.object({
  code: z.string().trim().min(2).max(50).regex(/^[A-Z0-9-]+$/),
  name: z.string().trim().min(2),
  description: z.string().trim(),
  maxExamsPerPatient: z.coerce.number().int().min(1).max(6),
  reviewDeadlineDays: z.coerce.number().int().min(1).max(90),
})

type FormValues = z.input<typeof FormSchema>

export function CreateStudyDialog() {
  const t = useTranslations('corelab.create')
  const tStudies = useTranslations('corelab.studies')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { code: '', name: '', description: '', maxExamsPerPatient: 2, reviewDeadlineDays: 14 },
  })

  const action = useAction(createStudyAction, {
    onSuccess: ({ data }) => {
      toast.success(t('created'))
      setOpen(false)
      form.reset()
      if (data?.id) router.push(`/corelab/admin/studies/${data.id}`)
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {tStudies('new')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            action.execute({
              code: values.code,
              name: values.name,
              description: values.description,
              maxExamsPerPatient: Number(values.maxExamsPerPatient),
              reviewDeadlineDays: Number(values.reviewDeadlineDays),
            }),
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="study-code">{t('code')}</Label>
            <Input id="study-code" {...form.register('code')} placeholder="MIR-DJ-2024" />
            <p className={form.formState.errors.code ? 'text-xs text-red-600' : 'text-xs text-text-secondary'}>
              {t('codeHelp')}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="study-name">{t('name')}</Label>
            <Input id="study-name" {...form.register('name')} />
            {form.formState.errors.name ? <p className="text-xs text-red-600">{t('nameRequired')}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="study-description">{t('studyDescription')}</Label>
            <Textarea id="study-description" rows={3} {...form.register('description')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="study-max-exams">{t('maxExams')}</Label>
              <Input id="study-max-exams" type="number" min={1} max={6} {...form.register('maxExamsPerPatient')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="study-deadline">{t('reviewDeadline')}</Label>
              <Input id="study-deadline" type="number" min={1} max={90} {...form.register('reviewDeadlineDays')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={action.isPending}>{t('submit')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
