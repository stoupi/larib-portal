'use client'

import { useTranslations } from 'next-intl'
import { CollapsibleCard } from '../editor/collapsible-card'
import { CarouselEmailTag } from './carousel-email-tag'
import { CarouselSendButton } from './carousel-send-button'
import type { CarouselEmailController } from '../article/carousel-email-dialog'

export function CommunicationCard({
  articleId,
  carouselEmailSentAt,
  locale,
  controller,
}: {
  articleId: string
  carouselEmailSentAt: Date | null
  locale: string
  controller: CarouselEmailController
}) {
  const t = useTranslations('publications.communication')
  const sentAt = carouselEmailSentAt ? carouselEmailSentAt.toISOString() : null

  return (
    <CollapsibleCard
      title={
        <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-coral-600">
          <span className="h-2 w-2 rounded-full bg-coral-500" />
          {t('cardTitle')}
        </span>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-text-secondary">{t('cardDescription')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <CarouselEmailTag sentAt={sentAt} locale={locale} />
          <CarouselSendButton alreadySent={sentAt !== null} onClick={() => controller.openFor(articleId)} />
        </div>
      </div>
    </CollapsibleCard>
  )
}
