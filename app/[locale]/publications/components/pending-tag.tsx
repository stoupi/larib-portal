'use client'

import { useTranslations } from 'next-intl'
import { Clock, TriangleAlert } from 'lucide-react'
import { pendingDelay } from '@/lib/publications/pending-delay'
import type { ArticleStatusValue } from '@/lib/services/publications/articles'

export function PendingTag({ pendingDays, status }: { pendingDays: number; status: ArticleStatusValue }) {
  const t = useTranslations('publications')
  const delay = pendingDelay(pendingDays)
  const rejected = status === 'TO_RESUBMIT'
  const Icon = rejected ? TriangleAlert : Clock
  const key = rejected ? 'rejected' : 'pending'

  return (
    <span
      className={
        rejected
          ? 'inline-flex items-center gap-1.5 text-xs font-bold text-[#DC2626] tabular-nums dark:text-[#FCA5A5]'
          : 'inline-flex items-center gap-1.5 text-xs font-bold text-[#B45309] tabular-nums dark:text-[#FBBF24]'
      }
    >
      <Icon className="h-3 w-3" strokeWidth={2.2} />
      {delay.unit === 'days'
        ? t(`myPub.${key}`, { days: delay.days })
        : t(`myPub.${key}Months`, { months: delay.months })}
    </span>
  )
}
