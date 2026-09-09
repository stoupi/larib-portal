'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { BookMarked } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldOrigin } from '@/lib/corelab/crf/origin'

export function OriginNote({ tone, children }: { tone: 'library' | 'tuned' | 'study'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-[10px] border p-2.5 text-[12.5px] leading-relaxed',
        tone === 'library' ? 'border-success-100 bg-success-50 text-success-700' : '',
        tone === 'tuned' ? 'border-warn-100 bg-warn-50 text-warn-700' : '',
        tone === 'study' ? 'border-navy-100 bg-navy-50 text-navy-600' : '',
      )}
    >
      {children}
    </div>
  )
}

export function OriginTag({ tone, children }: { tone: 'tuned' | 'study' | 'new'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex flex-none items-center rounded-md border px-1.5 py-px text-[10.5px] font-medium',
        tone === 'tuned' ? 'border-warn-100 bg-warn-50 text-warn-700' : '',
        tone === 'study' ? 'border-navy-100 bg-navy-50 text-navy-600' : '',
        tone === 'new' ? 'border-coral-200 bg-coral-50 text-coral-700' : '',
      )}
    >
      {children}
    </span>
  )
}

// Only what comes from the library carries a mark: a variable of the study's own is the
// unmarked case, and marking it too would drown the signal.
export function OriginMark({ origin, count }: { origin: FieldOrigin; count?: number }) {
  const t = useTranslations('corelab.crfEditor')
  if (origin === 'LIBRARY') {
    return <BookMarked className="size-3.5 flex-none text-navy-300" aria-label={t('fromLibrary')} />
  }
  if (origin === 'TUNED') {
    return <OriginTag tone="tuned">{count === undefined ? t('tagTuned') : count}</OriginTag>
  }
  return null
}
