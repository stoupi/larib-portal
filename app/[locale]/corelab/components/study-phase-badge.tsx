import { useTranslations } from 'next-intl'
import type { CorelabStudyPhase } from '@/app/generated/prisma'

const PHASE_STYLE: Record<CorelabStudyPhase, string> = {
  DRAFT: 'border-neutral-200 bg-neutral-100 text-neutral-700',
  RUN_IN: 'border-blue-200 bg-blue-50 text-blue-700',
  PRODUCTION: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CLOSED: 'border-neutral-200 bg-neutral-100 text-neutral-600',
}

export function StudyPhaseBadge({ phase }: { phase: CorelabStudyPhase }) {
  const t = useTranslations('corelab')
  return (
    <span className={`inline-flex items-center rounded-[10px] border px-2 py-0.5 text-xs font-medium ${PHASE_STYLE[phase]}`}>
      {t(`phase.${phase}`)}
    </span>
  )
}
