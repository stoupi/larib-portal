import { useTranslations } from 'next-intl'
import type { CorelabCertificationPhase } from '@/app/generated/prisma'

const STEPS: CorelabCertificationPhase[] = ['TRAINING', 'CALIBRATION', 'PRODUCTION']

export function PhaseTrack({ phase, muted = false }: { phase: CorelabCertificationPhase | null; muted?: boolean }) {
  const t = useTranslations('corelab')
  if (!phase) {
    return <span className="text-xs text-text-secondary">{t('certification.noCertification')}</span>
  }
  const reached = STEPS.indexOf(phase)
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((step, index) => (
        <span
          key={step}
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            index === reached
              ? 'bg-coral-500 text-white'
              : index < reached
                ? 'bg-emerald-50 text-emerald-700'
                : muted
                  ? 'bg-neutral-100 text-neutral-400'
                  : 'bg-neutral-100 text-neutral-500'
          }`}
        >
          {t(`certification.${step}`)}
        </span>
      ))}
    </div>
  )
}
