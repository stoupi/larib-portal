'use client'

import { useTranslations } from 'next-intl'
import { MailCheck, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const TAG_BASE =
  'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-bold leading-none whitespace-nowrap'

export function CarouselEmailTag({ sentAt, locale }: { sentAt: string | null; locale: string }) {
  const t = useTranslations('publications.communication')

  if (!sentAt) {
    return (
      <span
        className={cn(
          TAG_BASE,
          'border-[#E2E8F0] bg-[#F1F5F9] text-[#64748B] dark:border-[rgba(148,163,184,0.28)] dark:bg-[rgba(148,163,184,0.16)] dark:text-[#CBD5E1]',
        )}
      >
        <Clock className="size-3.5" strokeWidth={2.2} />
        {t('tagPending')}
      </span>
    )
  }

  const sentDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(sentAt))
  return (
    <span
      className={cn(
        TAG_BASE,
        'border-[#A7F3D0] bg-[#ECFDF5] text-[#047857] dark:border-[rgba(16,185,129,0.3)] dark:bg-[rgba(16,185,129,0.15)] dark:text-[#6EE7B7]',
      )}
    >
      <MailCheck className="size-3.5" strokeWidth={2.2} />
      {t('tagSent', { date: sentDate })}
    </span>
  )
}
