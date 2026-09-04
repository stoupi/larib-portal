import { computeAverage, computeDiscordanceLevel, type DiscordanceLevel } from '@/lib/corelab/crf/discordance'
import { compareSegmentMaps } from '@/lib/corelab/crf/segments'
import type { CrfDefinition, DiscordanceThreshold, FieldDefinition } from '@/lib/corelab/crf/schema'
import type { FieldValue, ReadingValues, SegmentValues } from '@/types/corelab'

export type DecisionType = 'AVERAGE' | 'R1' | 'R2' | 'CUSTOM'

export type ComparedField = {
  examId: string
  sequenceId: string
  fieldId: string
  field: FieldDefinition
  r1?: FieldValue
  r2?: FieldValue
  level: DiscordanceLevel
  average: number | null
  segmentDiff?: { discordant: number[]; count: number }
}

export function comparedKey(entry: Pick<ComparedField, 'examId' | 'sequenceId' | 'fieldId'>): string {
  return `${entry.examId}.${entry.sequenceId}.${entry.fieldId}`
}

export function compareReadings(
  definition: CrfDefinition,
  thresholds: DiscordanceThreshold[],
  firstReading: ReadingValues,
  secondReading: ReadingValues | null,
  examIds: string[],
): ComparedField[] {
  const thresholdOf = new Map(thresholds.map((threshold) => [threshold.fieldId, threshold]))

  return examIds.flatMap((examId) =>
    definition.flatMap((sequence) =>
      sequence.sections.flatMap((section) =>
        section.fields.map((field): ComparedField => {
          const r1 = firstReading[examId]?.[sequence.id]?.[field.id]
          const r2 = secondReading?.[examId]?.[sequence.id]?.[field.id]
          const isSegment = field.type.startsWith('segment_')

          if (!secondReading) {
            return { examId, sequenceId: sequence.id, fieldId: field.id, field, r1, level: 'NOT_COMPARED', average: null }
          }
          if (isSegment) {
            return {
              examId, sequenceId: sequence.id, fieldId: field.id, field, r1, r2,
              level: 'NOT_COMPARED',
              average: null,
              segmentDiff: compareSegmentMaps(
                r1?.value as SegmentValues | undefined,
                r2?.value as SegmentValues | undefined,
                field.segmentCount === 16 ? 16 : 17,
              ),
            }
          }
          return {
            examId, sequenceId: sequence.id, fieldId: field.id, field, r1, r2,
            level: computeDiscordanceLevel(field, r1?.value ?? null, r2?.value ?? null, thresholdOf.get(field.id)),
            average: computeAverage(r1?.value ?? null, r2?.value ?? null),
          }
        }),
      ),
    ),
  )
}

export function finalValueFor(decision: DecisionType, compared: ComparedField, customValue?: unknown): unknown {
  if (decision === 'CUSTOM') return customValue ?? null
  if (decision === 'R2') return compared.r2?.value ?? null
  if (decision === 'AVERAGE') return compared.average ?? compared.r1?.value ?? null
  return compared.r1?.value ?? null
}

export function reviewComplete(
  compared: ComparedField[],
  decisions: Map<string, { decision: DecisionType }>,
): { pending: string[]; complete: boolean } {
  const pending = compared
    .filter((entry) => entry.level === 'MINOR' || entry.level === 'MAJOR')
    .filter((entry) => !decisions.has(comparedKey(entry)))
    .map(comparedKey)
  return { pending, complete: pending.length === 0 }
}
