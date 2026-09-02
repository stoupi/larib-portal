import type { DiscordanceThreshold, FieldDefinition } from './schema'

export const DEFAULT_THRESHOLD = { minorPercent: 5, majorPercent: 10 }

export type DiscordanceLevel = 'OK' | 'MINOR' | 'MAJOR' | 'NOT_COMPARED'

function isMissing(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

export function computeAverage(first: unknown, second: unknown): number | null {
  if (typeof first !== 'number' || typeof second !== 'number') return null
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null
  return (first + second) / 2
}

export function computeDiscordanceLevel(
  field: FieldDefinition,
  firstReading: unknown,
  secondReading: unknown,
  threshold: Pick<DiscordanceThreshold, 'minorPercent' | 'majorPercent'> | undefined,
): DiscordanceLevel {
  if (isMissing(firstReading) && isMissing(secondReading)) return 'NOT_COMPARED'
  if (isMissing(firstReading) || isMissing(secondReading)) return 'MAJOR'

  if (field.type === 'boolean' || field.type === 'categorical') {
    return firstReading === secondReading ? 'OK' : 'MAJOR'
  }
  if (field.type !== 'numeric') return 'NOT_COMPARED'

  const average = computeAverage(firstReading, secondReading)
  if (average === null) return 'NOT_COMPARED'
  if (average === 0) return firstReading === secondReading ? 'OK' : 'MAJOR'

  const limits = threshold ?? DEFAULT_THRESHOLD
  const gap = (Math.abs(Number(firstReading) - Number(secondReading)) / Math.abs(average)) * 100
  if (gap >= limits.majorPercent) return 'MAJOR'
  if (gap >= limits.minorPercent) return 'MINOR'
  return 'OK'
}
