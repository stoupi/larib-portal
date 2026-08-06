'use client'

import { useTranslations } from 'next-intl'
import { Layers, CircleCheck, Clock } from 'lucide-react'
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
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-bg-surface px-3 py-2 shadow-elevation-xs">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-text-secondary dark:bg-white/10">
        <Icon className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <p className="text-xl font-extrabold leading-none tracking-tight text-text-primary tabular-nums">{value}</p>
        <p className="truncate text-xs text-text-secondary">{label}</p>
      </div>
      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        {hint}
      </span>
    </div>
  )
}

export function DashboardKpis({ metrics }: { metrics: DashboardMetrics }) {
  const t = useTranslations('publications.adminHome.kpi')

  return (
    <section aria-label={t('section')} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
    </section>
  )
}
