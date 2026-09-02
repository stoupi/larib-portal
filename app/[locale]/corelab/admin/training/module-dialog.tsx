'use client'

import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SingleSelect } from '@/components/ui/single-select'
import { createModuleAction } from '../actions-training'

type QuestionForm = { id: string; prompt: string; choiceA: string; choiceB: string; choiceC: string; correct: string }
type ModuleForm = {
  title: string
  description: string
  softwareName: string
  order: number
  durationMinutes: number
  passThreshold: number
  questions: QuestionForm[]
}

function emptyQuestion(index: number): QuestionForm {
  return { id: `q${index}`, prompt: '', choiceA: '', choiceB: '', choiceC: '', correct: 'a' }
}

export function ModuleDialog({ studyOptions }: { studyOptions: Array<{ value: string; label: string }> }) {
  const t = useTranslations('corelab.training.admin')
  const tScope = useTranslations('corelab.training.scope')
  const tType = useTranslations('corelab.training.type')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<'CORE' | 'SOFTWARE' | 'STUDY'>('CORE')
  const [type, setType] = useState<'VIDEO' | 'QUIZ'>('VIDEO')
  const [studyId, setStudyId] = useState('')

  const form = useForm<ModuleForm>({
    defaultValues: { title: '', description: '', softwareName: '', order: 1, durationMinutes: 10, passThreshold: 80, questions: [emptyQuestion(1)] },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'questions' })

  const action = useAction(createModuleAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      setOpen(false)
      form.reset()
      router.refresh()
    },
    onError: () => toast.error(t('save')),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t('new')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('new')}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            action.execute({
              scope,
              type,
              softwareName: scope === 'SOFTWARE' ? values.softwareName : null,
              studyId: scope === 'STUDY' ? studyId : null,
              order: Number(values.order),
              title: values.title,
              description: values.description,
              durationMinutes: Number(values.durationMinutes),
              passThreshold: type === 'QUIZ' ? Number(values.passThreshold) : null,
              quiz: type === 'QUIZ'
                ? {
                    questions: values.questions.map((question, index) => ({
                      id: `q${index + 1}`,
                      prompt: question.prompt,
                      choices: [
                        { id: 'a', label: question.choiceA },
                        { id: 'b', label: question.choiceB },
                        ...(question.choiceC.trim() ? [{ id: 'c', label: question.choiceC }] : []),
                      ],
                      correctChoiceId: question.correct,
                    })),
                  }
                : null,
            }),
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="module-title">{t('moduleTitle')}</Label>
              <Input id="module-title" {...form.register('title')} />
            </div>
            <div className="space-y-2">
              <Label>{t('moduleScope')}</Label>
              <SingleSelect
                options={(['CORE', 'SOFTWARE', 'STUDY'] as const).map((value) => ({ value, label: tScope(value) }))}
                value={scope}
                onChange={(value) => setScope(value === 'SOFTWARE' ? 'SOFTWARE' : value === 'STUDY' ? 'STUDY' : 'CORE')}
              />
            </div>
            {scope === 'SOFTWARE' ? (
              <div className="space-y-2">
                <Label htmlFor="module-software">{t('softwareName')}</Label>
                <Input id="module-software" {...form.register('softwareName')} />
              </div>
            ) : null}
            {scope === 'STUDY' ? (
              <div className="space-y-2">
                <Label>{t('usedBy')}</Label>
                <SingleSelect options={studyOptions} value={studyId} onChange={setStudyId} />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>{t('moduleType')}</Label>
              <SingleSelect
                options={(['VIDEO', 'QUIZ'] as const).map((value) => ({ value, label: tType(value) }))}
                value={type}
                onChange={(value) => setType(value === 'QUIZ' ? 'QUIZ' : 'VIDEO')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-duration">{t('duration')}</Label>
              <Input id="module-duration" type="number" min={0} {...form.register('durationMinutes')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-order">{t('order')}</Label>
              <Input id="module-order" type="number" min={0} {...form.register('order')} />
            </div>
            {type === 'QUIZ' ? (
              <div className="space-y-2">
                <Label htmlFor="module-threshold">{t('passThreshold')}</Label>
                <Input id="module-threshold" type="number" min={1} max={100} {...form.register('passThreshold')} />
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="module-description">{t('description')}</Label>
            <Textarea id="module-description" rows={2} {...form.register('description')} />
          </div>

          {type === 'QUIZ' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('questions')}</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => append(emptyQuestion(fields.length + 1))}>
                  {t('addQuestion')}
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-2 rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Input placeholder={t('prompt')} {...form.register(`questions.${index}.prompt`)} />
                    <Button type="button" variant="ghost" size="sm" aria-label={t('removeQuestion')} onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input placeholder={t('choice', { index: 1 })} {...form.register(`questions.${index}.choiceA`)} />
                    <Input placeholder={t('choice', { index: 2 })} {...form.register(`questions.${index}.choiceB`)} />
                    <Input placeholder={t('choice', { index: 3 })} {...form.register(`questions.${index}.choiceC`)} />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-text-secondary">
                    <span>{t('correct')}</span>
                    {['a', 'b', 'c'].map((choiceId) => (
                      <label key={choiceId} className="flex items-center gap-1">
                        <input type="radio" value={choiceId} {...form.register(`questions.${index}.correct`)} />
                        {choiceId.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={action.isPending}>{t('save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
