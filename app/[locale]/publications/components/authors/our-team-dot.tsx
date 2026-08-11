'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export function OurTeamDot({ className }: { className?: string }) {
  const t = useTranslations('publications.editor.picker')
  const label = t('ourTeam')
  return (
    <span
      role="img"
      title={label}
      aria-label={label}
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full bg-coral-500', className)}
    />
  )
}
