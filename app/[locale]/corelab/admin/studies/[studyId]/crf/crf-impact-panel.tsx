'use client'

import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Cap, OriginNote, PaneBand, PaneFooter } from './crf-chrome'
import type { VersionChange } from '@/lib/corelab/crf/diff-versions'

const LEVEL_STYLE: Record<VersionChange['impact'], string> = {
  HARMLESS: 'text-success-600',
  CREATES_GAP: 'text-warn-600',
  BREAKS_READING: 'text-danger-600',
}

export function CrfImpactPanel({ changes, context, onClose }: {
  changes: VersionChange[]
  context: { signedReadings: number; publishedNumber: number | null; drift: number; modality: string }
  onClose: () => void
}) {
  const t = useTranslations('corelab.crfEditor')
  const published = context.publishedNumber !== null

  return (
    <>
      <PaneBand
        kind={t('publication')}
        title={published ? t('impactTitle') : t('firstPublication')}
        subtitle={
          context.signedReadings > 0
            ? t('signedReadings', { count: context.signedReadings })
            : t('noSigned')
        }
      />
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {changes.length === 0 ? (
          <OriginNote tone="library">
            <span className="flex gap-2.5">
              <Check className="mt-0.5 size-4 flex-none" />
              <span>{published ? t('cleanPublished', { number: context.publishedNumber ?? 0 }) : t('cleanFirst')}</span>
            </span>
          </OriginNote>
        ) : (
          <div>
            <Cap>{t('changesSince', { count: changes.length, number: context.publishedNumber ?? 0 })}</Cap>
            {changes.map((change) => (
              <div
                key={`${change.sequenceId}.${change.fieldId}.${change.kind}`}
                className="flex gap-2.5 border-b border-gray-100 py-2 text-[12.5px] leading-snug"
              >
                <span className={cn('flex-none font-semibold', LEVEL_STYLE[change.impact])}>{t(`impacts.${change.impact}`)}</span>
                <span className="min-w-0 text-gray-700">{change.detail}</span>
              </div>
            ))}
          </div>
        )}

        <Cap>
          <span className="mt-4 block">{t('locksTitle')}</span>
        </Cap>
        <ul className="m-0 list-disc pl-4 text-[12.5px] leading-relaxed text-text-secondary">
          <li>{t('lockIds')}</li>
          <li>{t('lockRemoval')}</li>
          <li>{t('lockBounds')}</li>
        </ul>

        <Cap>
          <span className="mt-4 block">{t('driftTitle')}</span>
        </Cap>
        <p className="m-0 text-[12.5px] leading-relaxed text-text-secondary">
          {context.drift === 0 ? t('driftNone', { modality: context.modality }) : t('driftSome', { count: context.drift })}
        </p>
      </div>
      <PaneFooter>
        <Button variant="outline" className="w-full" onClick={onClose}>{t('backToVariable')}</Button>
      </PaneFooter>
    </>
  )
}
