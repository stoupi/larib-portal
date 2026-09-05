'use client'

import { BullsEye } from './bulls-eye'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'
import type { SegmentValues } from '@/types/corelab'

type SegmentComparisonProps = {
  field: FieldDefinition
  sides: Array<{ label: string; value: SegmentValues | undefined }>
  highlight: number[]
}

export function SegmentComparison({ field, sides, highlight }: SegmentComparisonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sides.map((side) => (
        <div key={side.label} className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{side.label}</p>
          <BullsEye field={field} value={side.value} onChange={() => undefined} readOnly highlight={highlight} />
        </div>
      ))}
    </div>
  )
}
