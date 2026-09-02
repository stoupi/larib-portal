'use client'

import { useTranslations, useLocale } from 'next-intl'
import { MailCheck, MailWarning } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { carouselEmailState } from '@/lib/publications/communication'
import type { ArticleStatusValue } from '@/lib/services/publications/articles'

export function CarouselEmailDot({
  status,
  carouselEmailSentAt,
}: {
  status: ArticleStatusValue
  carouselEmailSentAt: string | null
}) {
  const t = useTranslations('publications.communication')
  const locale = useLocale()
  const state = carouselEmailState({ status, carouselEmailSentAt })

  if (state === 'notApplicable') return null

  const sent = state === 'sent'
  const label = sent
    ? t('rowSent', {
        date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(carouselEmailSentAt ?? '')),
      })
    : t('rowPending')

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={label}
          className={
            sent
              ? 'inline-flex text-[#047857] dark:text-[#6EE7B7]'
              : 'inline-flex text-[#EA580C] dark:text-[#FDBA74]'
          }
        >
          {sent ? <MailCheck className="size-4" strokeWidth={2.2} /> : <MailWarning className="size-4" strokeWidth={2.2} />}
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
