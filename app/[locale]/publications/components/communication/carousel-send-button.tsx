'use client'

import { useTranslations } from 'next-intl'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CarouselSendButton({
  onClick,
  alreadySent,
  className,
}: {
  onClick: () => void
  alreadySent: boolean
  className?: string
}) {
  const t = useTranslations('publications.communication')
  const label = alreadySent ? t('resendEmail') : t('sendEmail')

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-coral-500 to-coral-600 px-4 text-[13px] font-bold text-white shadow-[0_8px_18px_-8px_rgba(214,31,85,0.6)] transition hover:brightness-105',
        className,
      )}
    >
      <Send className="size-4" strokeWidth={2.2} />
      {label}
    </button>
  )
}
