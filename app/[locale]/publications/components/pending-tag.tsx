'use client'

import { useTranslations } from 'next-intl'
import { Clock, PenLine, TriangleAlert } from 'lucide-react'
import { pendingDelay } from '@/lib/publications/pending-delay'
import type { ArticleStatusValue } from '@/lib/services/publications/articles'

const AMBER = 'text-[#B45309] dark:text-[#FBBF24]'

const SITUATIONS = {
  UNDER_REVIEW: { key: 'underReview', icon: Clock, tone: AMBER },
  REVISION: { key: 'revision', icon: PenLine, tone: AMBER },
  TO_RESUBMIT: { key: 'rejected', icon: TriangleAlert, tone: 'text-[#DC2626] dark:text-[#FCA5A5]' },
} as const

type DelayedStatus = keyof typeof SITUATIONS

function isDelayed(status: ArticleStatusValue): status is DelayedStatus {
  return status in SITUATIONS
}

export function PendingTag({ pendingDays, status }: { pendingDays: number; status: ArticleStatusValue }) {
  const t = useTranslations('publications')
  if (!isDelayed(status)) return null

  const situation = SITUATIONS[status]
  const delay = pendingDelay(pendingDays)
  const Icon = situation.icon

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold tabular-nums ${situation.tone}`}>
      <Icon className="h-3 w-3" strokeWidth={2.2} />
      {delay.unit === 'days'
        ? t(`myPub.${situation.key}`, { days: delay.days })
        : t(`myPub.${situation.key}Months`, { months: delay.months })}
    </span>
  )
}
