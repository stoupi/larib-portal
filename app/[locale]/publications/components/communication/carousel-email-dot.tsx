'use client'

import { useTranslations, useLocale } from 'next-intl'
import { MailCheck } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LinkedinBadge } from '@/components/ui/linkedin-badge'
import { carouselEmailState } from '@/lib/publications/communication'
import type { ArticleStatusValue } from '@/lib/services/publications/articles'

// Only what happened is marked. An email still owed would light up every paper imported
// from PubMed, none of which will ever get one; a published post replaces the email mark,
// since the errand it belonged to is over.
export function CarouselEmailDot({
  status,
  carouselEmailSentAt,
  linkedinPostUrl,
}: {
  status: ArticleStatusValue
  carouselEmailSentAt: string | null
  linkedinPostUrl?: string | null
}) {
  const t = useTranslations('publications.communication')
  const locale = useLocale()
  const state = carouselEmailState({ status, carouselEmailSentAt, linkedinPostUrl })

  if (state === 'posted') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span aria-label={t('rowPosted')} className="inline-flex">
            <LinkedinBadge />
          </span>
        </TooltipTrigger>
        <TooltipContent>{t('rowPosted')}</TooltipContent>
      </Tooltip>
    )
  }

  if (state !== 'sent') return null

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
