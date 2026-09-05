import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import { StudyPhaseBadge } from './study-phase-badge'
import { PhaseTrack } from './phase-track'
import { CapabilityBadges } from './capability-badges'
import type { MemberStudy } from '@/lib/services/corelab/studies'

export function StudyCards({ memberships }: { memberships: MemberStudy[] }) {
  const t = useTranslations('corelab')

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {memberships.map((membership) => (
        <div key={membership.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex flex-1 flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">{membership.study.name}</h3>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {[membership.study.code, ...membership.study.modalities].join(' · ')}
                </p>
              </div>
              <StudyPhaseBadge phase={membership.study.phase} />
            </div>

            <div className="my-4 h-px bg-border" />

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-text-secondary">{t('home.yourRole')}</span>
              <CapabilityBadges capabilities={membership} />
            </div>

            <div className="mt-3">
              <PhaseTrack phase={membership.canRead ? membership.certificationPhase : null} />
            </div>
          </div>
          <div className="px-6 pb-5">
            <div className="border-t border-border pt-3.5">
              <Link
                href={`/corelab/studies/${membership.study.id}`}
                className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-coral-600"
              >
                {membership.study.phase === 'CLOSED' ? t('home.consultStudy') : t('home.openStudy')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
