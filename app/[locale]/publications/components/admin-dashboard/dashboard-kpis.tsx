'use client'

import { useTranslations } from 'next-intl'
import { Layers, CircleCheck, Clock, Users } from 'lucide-react'
import type { ComponentType } from 'react'
import type { DashboardMetrics } from '@/lib/publications/admin-dashboard'

function KpiCard({
  icon: Icon,
  hint,
  value,
  label,
}: {
  icon: ComponentType<{ className?: string }>
  hint: string
  value: number
  label: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-gray-100 text-text-secondary dark:bg-white/10">
          <Icon className="size-5" />
        </span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          {hint}
        </span>
      </div>
      <p className="mt-5 text-4xl font-extrabold tracking-tight text-text-primary tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-text-secondary">{label}</p>
    </div>
  )
}

export function DashboardKpis({ metrics }: { metrics: DashboardMetrics }) {
  const t = useTranslations('publications.adminHome.kpi')

  return (
    <section aria-label={t('section')} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={Layers}
        hint={t('thisYear', { count: metrics.currentYearCount })}
        value={metrics.total}
        label={t('articles')}
      />
      <KpiCard
        icon={CircleCheck}
        hint={t('share', { value: metrics.publishedShare })}
        value={metrics.publishedCount}
        label={t('published')}
      />
      <KpiCard
        icon={Clock}
        hint={t('inProgressHint')}
        value={metrics.inProgressCount}
        label={t('inProgress')}
      />
      <KpiCard
        icon={Users}
        hint={t('studies', { count: metrics.studyCount })}
        value={metrics.coAuthorCount}
        label={t('coAuthors')}
      />
    </section>
  )
}
