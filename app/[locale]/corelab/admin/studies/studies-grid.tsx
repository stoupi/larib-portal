import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import { StudyPhaseBadge } from '../../components/study-phase-badge'
import type { StudySummary } from '@/lib/services/corelab/studies'

type StudiesGridProps = {
  studies: StudySummary[]
  latestVersion: Map<string, number | null>
}

export function StudiesGrid({ studies, latestVersion }: StudiesGridProps) {
  const t = useTranslations('corelab.studies')

  if (studies.length === 0) {
    return <p className="text-sm text-text-secondary">{t('empty')}</p>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {studies.map((study) => {
        const version = latestVersion.get(study.id) ?? null
        const action = study.phase === 'DRAFT' ? t('configure') : study.phase === 'CLOSED' ? t('consult') : t('manage')
        return (
          <Link
            key={study.id}
            href={`/corelab/admin/studies/${study.id}`}
            className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:shadow-md"
          >
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">{study.name}</h3>
                  <p className="mt-0.5 text-sm text-text-secondary">{[study.code, ...study.modalities].join(' · ')}</p>
                </div>
                <StudyPhaseBadge phase={study.phase} />
              </div>

              <div className="my-4 h-px bg-border" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xl font-light text-text-primary">{study._count.memberships}</div>
                  <div className="mt-0.5 text-[11.5px] text-text-secondary">{t('members')}</div>
                </div>
                <div>
                  <div className="text-xl font-light text-text-primary">{version === null ? '—' : `v${version}`}</div>
                  <div className="mt-0.5 text-[11.5px] text-text-secondary">{version === null ? t('noCrf') : t('crfVersion')}</div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-5">
              <div className="border-t border-border pt-3.5">
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-coral-600">
                  {action}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
