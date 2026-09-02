import type { FieldDefinition } from './schema'
import type { SegmentValues } from '@/types/corelab'

export function compareSegmentMaps(
  first: SegmentValues | undefined,
  second: SegmentValues | undefined,
  segmentCount: 16 | 17,
): { discordant: number[]; count: number } {
  if (!first && !second) return { discordant: [], count: 0 }
  const discordant = Array.from({ length: segmentCount }, (unused, index) => index + 1).filter(
    (segment) => (first ?? {})[String(segment)] !== (second ?? {})[String(segment)],
  )
  return { discordant, count: discordant.length }
}

export function segmentTolerance(field: FieldDefinition): number {
  if (!field.calibrationTolerance) return 1
  return Math.round(field.calibrationTolerance.absolute)
}
