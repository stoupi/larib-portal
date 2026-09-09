'use client'

import { useTranslations } from 'next-intl'
import { BookMarked } from 'lucide-react'
import { OriginTag } from './crf-chrome'
import type { FieldOrigin } from '@/lib/corelab/crf/origin'

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
