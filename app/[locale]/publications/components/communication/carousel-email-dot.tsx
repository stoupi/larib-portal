'use client'

import { useTranslations, useLocale } from 'next-intl'
import { MailCheck } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { carouselEmailState } from '@/lib/publications/communication'
import type { ArticleStatusValue } from '@/lib/services/publications/articles'

// Only a departure is worth a mark. Flagging the ones still owed would light up every
// paper imported from PubMed, none of which will ever get a carousel email.
export function CarouselEmailDot({
  status,
  carouselEmailSentAt,
}: {
  status: ArticleStatusValue
  carouselEmailSentAt: string | null
}) {
  const t = useTranslations('publications.communication')
  const locale = useLocale()

  if (carouselEmailState({ status, carouselEmailSentAt }) !== 'sent') return null

  const label = t('rowSent', {
    date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(carouselEmailSentAt ?? '')),
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span aria-label={label} className="inline-flex text-[#047857] dark:text-[#6EE7B7]">
          <MailCheck className="size-4" strokeWidth={2.2} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
