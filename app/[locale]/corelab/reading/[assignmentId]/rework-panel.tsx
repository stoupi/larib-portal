'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Checkbox } from '@/components/ui/checkbox'

export type ReworkPoint = { key: string; sequenceName: string; comment: string }

type ReworkPanelProps = {
  points: ReworkPoint[]
  onAllHandled: (allHandled: boolean) => void
}

export function ReworkPanel({ points, onAllHandled }: ReworkPanelProps) {
  const t = useTranslations('corelab.review.reader')
  const [handled, setHandled] = useState<Record<string, boolean>>({})

  function toggle(key: string, next: boolean) {
    const updated = { ...handled, [key]: next }
    setHandled(updated)
    onAllHandled(points.every((point) => updated[point.key]))
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="rework-panel">
      <p className="text-sm font-medium text-amber-900">{t('banner')}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-800">{t('message')}</p>
      <ul className="mt-2 space-y-2">
        {points.map((point) => (
          <li key={point.key} className="flex items-start gap-2 text-sm">
            <Checkbox
              id={`rework-${point.key}`}
              checked={handled[point.key] ?? false}
              onCheckedChange={(next) => toggle(point.key, next === true)}
            />
            <label htmlFor={`rework-${point.key}`} className="text-amber-900">
              <span className="font-medium">{point.sequenceName}</span> — {point.comment}
              {handled[point.key] ? <span className="ml-2 text-xs text-emerald-700">{t('done')}</span> : null}
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
