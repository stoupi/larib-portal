'use client'

import { useTranslations } from 'next-intl'
import { Clock } from 'lucide-react'
import { pendingDelay } from '@/lib/publications/pending-delay'

export function PendingTag({ pendingDays }: { pendingDays: number }) {
  const t = useTranslations('publications')
  const delay = pendingDelay(pendingDays)

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B45309] tabular-nums dark:text-[#FBBF24]">
      <Clock className="h-3 w-3" strokeWidth={2.2} />
      {delay.unit === 'days'
        ? t('myPub.pending', { days: delay.days })
        : t('myPub.pendingMonths', { months: delay.months })}
    </span>
  )
}
