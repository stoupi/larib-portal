'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SignatureDialog } from '../../../components/signature-dialog'
import { changeStudyPhaseAction } from '../../actions'
import type { CorelabStudyPhase } from '@/app/generated/prisma'

const PHASES: CorelabStudyPhase[] = ['DRAFT', 'RUN_IN', 'PRODUCTION', 'CLOSED']

type StudyPhaseCardProps = {
  studyId: string
  phase: CorelabStudyPhase
  nextPhases: CorelabStudyPhase[]
  startedAt: string | null
  closedAt: string | null
}

export function StudyPhaseCard({ studyId, phase, nextPhases, startedAt, closedAt }: StudyPhaseCardProps) {
  const t = useTranslations('corelab.config')
  const tPhase = useTranslations('corelab.phase')
  const tSignature = useTranslations('corelab.signature')
  const router = useRouter()
  const [target, setTarget] = useState<CorelabStudyPhase | null>(null)

  const action = useAction(changeStudyPhaseAction, {
    onSuccess: () => {
      toast.success(t('phaseChanged'))
      setTarget(null)
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError === 'INVALID_PASSWORD' ? tSignature('invalidPassword') : tSignature('error'))
    },
  })

  const currentIndex = PHASES.indexOf(phase)

  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <h2 className="text-lg font-semibold text-text-primary">{t('phaseTitle')}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t('phaseSubtitle')}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {PHASES.map((step, index) => (
          <span
            key={step}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              index === currentIndex
                ? 'bg-coral-500 text-white'
                : index < currentIndex
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-neutral-100 text-neutral-400'
            }`}
          >
            {tPhase(step)}
          </span>
        ))}
      </div>

      <p className="mt-4 text-sm text-text-secondary">
        {closedAt ? t('phaseClosedOn', { date: closedAt }) : startedAt ? t('phaseStarted', { date: startedAt }) : null}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {nextPhases.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('phaseFinal')}</p>
        ) : (
          nextPhases.map((next) => (
            <Button key={next} variant="outline" onClick={() => setTarget(next)}>
              {t('moveTo', { phase: tPhase(next) })}
            </Button>
          ))
        )}
      </div>

      <SignatureDialog
        open={target !== null}
        onOpenChange={(open) => setTarget(open ? target : null)}
        title={tSignature('title')}
        summary={target ? t('moveTo', { phase: tPhase(target) }) : null}
        onConfirm={({ password, reason }) => {
          if (!target || target === 'DRAFT') return
          action.execute({ studyId, phase: target, password, reason })
        }}
      />
    </section>
  )
}
