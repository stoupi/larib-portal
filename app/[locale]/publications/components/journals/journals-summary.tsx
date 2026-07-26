'use client'

import { useTranslations } from 'next-intl'
import { FileText, CircleCheck, Clock, Zap } from 'lucide-react'
import type { ComponentType } from 'react'
import { daysToMonths, type JournalBankSummary } from '@/lib/publications/journal-metrics'

type SummaryCard = {
  icon: ComponentType<{ className?: string }>
  badge: string
  value: string
  unit: string | null
  label: string
  hint: string
}

function SummaryTile({ card }: { card: SummaryCard }) {
  const Icon = card.icon
  return (
    <div className="rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-gray-100 text-text-secondary dark:bg-white/10">
          <Icon className="size-5" />
        </span>
        <span className="rounded-full border border-coral-200 bg-coral-50 px-2.5 py-1 text-xs font-bold text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300">
          {card.badge}
        </span>
      </div>
      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="text-4xl font-extrabold tracking-tight text-text-primary tabular-nums">{card.value}</span>
        {card.unit && <span className="text-lg font-bold text-text-muted">{card.unit}</span>}
      </p>
      <p className="mt-1 text-sm font-semibold text-text-secondary">{card.label}</p>
      <p className="mt-0.5 text-xs text-text-muted">{card.hint}</p>
    </div>
  )
}

export function JournalsSummary({ summary }: { summary: JournalBankSummary }) {
  const t = useTranslations('publications.journals.summary')
  const emptyValue = '—'

  const cards: SummaryCard[] = [
    {
      icon: FileText,
      badge: t('allTime'),
      value: String(summary.publishedTotal),
      unit: null,
      label: t('articlesPublished'),
      hint: t('articlesHint', { ongoing: summary.ongoingTotal, journals: summary.journalCount }),
    },
    {
      icon: CircleCheck,
      badge: t('acceptBadge'),
      value: summary.acceptanceRate == null ? emptyValue : String(summary.acceptanceRate),
      unit: summary.acceptanceRate == null ? null : '%',
      label: t('acceptanceRate'),
      hint: t('acceptanceHint', { accepted: summary.acceptedTotal, submitted: summary.submittedTotal }),
    },
    {
      icon: Clock,
      badge: t('weighted'),
      value: summary.avgDelayDays == null ? emptyValue : String(daysToMonths(summary.avgDelayDays)),
      unit: summary.avgDelayDays == null ? null : t('months'),
      label: t('submissionToPublication'),
      hint: summary.avgDelayDays == null ? t('noDelayData') : t('daysHint', { days: Math.round(summary.avgDelayDays) }),
    },
    {
      icon: Zap,
      badge: t('bestDelay'),
      value: summary.fastestJournal == null ? emptyValue : String(daysToMonths(summary.fastestJournal.delayDays)),
      unit: summary.fastestJournal == null ? null : t('months'),
      label: t('fastestJournal'),
      hint: summary.fastestJournal?.name ?? t('noDelayData'),
    },
  ]

  return (
    <section aria-label={t('section')} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <SummaryTile key={card.label} card={card} />
      ))}
    </section>
  )
}
