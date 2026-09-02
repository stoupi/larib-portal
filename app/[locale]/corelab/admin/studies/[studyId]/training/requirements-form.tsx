'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { setStudyRequirementsAction } from '../../../actions-training'
import type { TrainingModuleSummary } from '@/lib/services/corelab/training'

type RequirementsFormProps = {
  studyId: string
  available: TrainingModuleSummary[]
  initialModuleIds: string[]
}

export function RequirementsForm({ studyId, available, initialModuleIds }: RequirementsFormProps) {
  const t = useTranslations('corelab.training.admin')
  const tScope = useTranslations('corelab.training.scope')
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(initialModuleIds)

  const action = useAction(setStudyRequirementsAction, {
    onSuccess: () => {
      toast.success(t('requirementsSaved'))
      router.refresh()
    },
    onError: () => toast.error(t('save')),
  })

  function move(moduleId: string, direction: -1 | 1) {
    setSelected((current) => {
      const index = current.indexOf(moduleId)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.length) return current
      const next = [...current]
      next[index] = current[target]
      next[target] = moduleId
      return next
    })
  }

  const ordered = [
    ...selected.map((moduleId) => available.find((module) => module.id === moduleId)).filter((module): module is TrainingModuleSummary => Boolean(module)),
    ...available.filter((module) => !selected.includes(module.id)),
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {ordered.map((module) => {
          const checked = selected.includes(module.id)
          return (
            <div key={module.id} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
              <Checkbox
                id={`module-${module.id}`}
                checked={checked}
                onCheckedChange={(next) =>
                  setSelected((current) => (next === true ? [...current, module.id] : current.filter((id) => id !== module.id)))
                }
              />
              <label htmlFor={`module-${module.id}`} className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text-primary">{module.title}</span>
                <span className="block text-xs text-text-secondary">{tScope(module.scope)}</span>
              </label>
              {checked ? (
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" aria-label={t('moveUp')} onClick={() => move(module.id, -1)}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" aria-label={t('moveDown')} onClick={() => move(module.id, 1)}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <Button disabled={action.isPending} onClick={() => action.execute({ studyId, moduleIds: selected })}>
        {t('save')}
      </Button>
    </div>
  )
}
