'use client'

import { useTranslations, useFormatter } from 'next-intl'
import { ArrowRight, FlaskConical, Users } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import type { CentreStudy } from '@/lib/services/publications/centres'

const STATUS_STYLE: Record<CentreStudy['status'], string> = {
  PLANNED: 'border-line bg-gray-100 text-gray-600',
  ONGOING: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  COMPLETED: 'border-navy-200 bg-navy-50 text-navy-700',
  STOPPED: 'border-amber-200 bg-amber-50 text-amber-700',
}

export function CentreStudiesPanel({ studies }: { studies: CentreStudy[] }) {
  const t = useTranslations('publications.centres')
  const tStatus = useTranslations('publications.studies.status')
  const format = useFormatter()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm">
          <span className="font-bold uppercase tracking-[0.12em] text-coral-600">{t('linkedStudies')}</span>{' '}
          <span className="rounded-full bg-gray-100 px-2 text-xs font-bold text-gray-600">{studies.length}</span>
        </p>
        <Link href="/publications/admin/studies" className="inline-flex items-center gap-1 text-sm font-bold text-coral-600 hover:gap-2">
          {t('openInStudies')} <ArrowRight className="size-4" />
        </Link>
      </div>
      {studies.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">{t('noStudies')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {studies.map((study) => (
            <Link
              key={study.id}
              href={`/publications/admin/studies/${study.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg-surface px-3 py-2 transition hover:border-coral-300"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-600">
                  <FlaskConical className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-text-primary">
                    {study.acronym ? <strong>{study.acronym}</strong> : study.title}
                    {study.acronym && <span className="ml-1 text-text-secondary">{study.title}</span>}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {[
                      study.nctId,
                      study.startDate ? format.dateTime(study.startDate, { year: 'numeric', month: 'short' }) : null,
                      `${study.investigatorsCount} ${t('investigators')}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>
              <span className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[study.status]}`}>
                {tStatus(study.status)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
