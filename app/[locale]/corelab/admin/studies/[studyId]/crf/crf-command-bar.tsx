'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ChangeImpact } from '@/lib/corelab/crf/diff-versions'

const PILL_STYLE: Record<ChangeImpact, string> = {
  HARMLESS: 'border-success-100 bg-success-50 text-success-700 hover:bg-success-100',
  CREATES_GAP: 'border-warn-100 bg-warn-50 text-warn-700 hover:bg-warn-100',
  BREAKS_READING: 'border-danger-100 bg-danger-50 text-danger-700 hover:bg-danger-100',
}

export type CommandActions = {
  openImpact: () => void
  save: () => void
  discard: () => void
  publish: () => void
}

export function CrfCommandBar({ version, impact, pending, actions }: {
  version: { draftNumber: number; publishedNumber: number | null }
  impact: { signedReadings: number; changes: number; worst: ChangeImpact; open: boolean }
  pending: boolean
  actions: CommandActions
}) {
  const t = useTranslations('corelab.crfEditor')
  const published = version.publishedNumber !== null

  const signed = impact.signedReadings > 0 ? t('signedReadings', { count: impact.signedReadings }) : t('noSigned')
  const changed = published
    ? `${t('changeCount', { count: impact.changes })}${impact.changes > 0 ? ` · ${t(`impacts.${impact.worst}`)}` : ''}`
    : t('nothingToBreak')

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-white px-4 py-3">
      <span className="inline-flex flex-none items-center gap-1.5 rounded-full border border-coral-100 bg-coral-50 px-2.5 py-1 text-[12.5px] font-semibold text-coral-700">
        <span className="size-1.5 rounded-full bg-coral-600" />
        {t('stateDraft')}
      </span>
      <span className="min-w-0 text-[13px] leading-snug text-text-secondary">
        {published
          ? t('versionPublished', { number: version.publishedNumber ?? 0, next: version.draftNumber })
          : t('versionNone', { next: version.draftNumber })}
      </span>
      <button
        type="button"
        data-testid="crf-impact-pill"
        onClick={actions.openImpact}
        className={cn(
          'inline-flex h-7 flex-none cursor-pointer items-center rounded-full border px-2.5 text-[12.5px]',
          PILL_STYLE[impact.changes === 0 ? 'HARMLESS' : impact.worst],
          impact.open ? 'ring-2 ring-line' : '',
        )}
      >
        {t('impactPill', { signed, changes: changed })}
      </button>
      <div className="ml-auto flex flex-none items-center gap-2">
        <Button variant="ghost" size="sm" disabled={pending} onClick={actions.discard}>{t('discard')}</Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={actions.save}>{t('save')}</Button>
        <Button size="sm" disabled={pending} onClick={actions.publish}>
          {t('publishVersion', { number: version.draftNumber })}
        </Button>
      </div>
    </div>
  )
}
