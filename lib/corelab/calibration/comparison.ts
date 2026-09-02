import { compareToGoldStandard, type ToleranceVerdict } from '@/lib/corelab/crf/tolerance'
import { compareSegmentMaps } from '@/lib/corelab/crf/segments'
import type { CrfDefinition } from '@/lib/corelab/crf/schema'
import type { ReadingValues, SegmentValues } from '@/types/corelab'

export type ComparisonRow = {
  key: string
  examId: string
  sequenceId: string
  sequenceName: string
  fieldId: string
  fieldName: string
  unit: string | null
  readerValue: unknown
  goldValue: unknown
  verdict: ToleranceVerdict
  discordantSegments: number | null
}

export function buildComparison(
  definition: CrfDefinition,
  readerValues: ReadingValues,
  goldValues: ReadingValues,
): ComparisonRow[] {
  const rows: ComparisonRow[] = []
  const examIds = new Set([...Object.keys(readerValues), ...Object.keys(goldValues)])

  for (const examId of [...examIds].sort()) {
    for (const sequence of definition) {
      for (const section of sequence.sections) {
        for (const field of section.fields) {
          const readerValue = readerValues[examId]?.[sequence.id]?.[field.id]?.value ?? null
          const goldValue = goldValues[examId]?.[sequence.id]?.[field.id]?.value ?? null
          if (readerValue === null && goldValue === null) continue

          const isSegment = field.type.startsWith('segment_')
          rows.push({
            key: `${examId}.${sequence.id}.${field.id}`,
            examId,
            sequenceId: sequence.id,
            sequenceName: sequence.name,
            fieldId: field.id,
            fieldName: field.name,
            unit: field.unit ?? null,
            readerValue,
            goldValue,
            verdict: isSegment
              ? { delta: null, withinTolerance: true, rule: 'not_compared' }
              : compareToGoldStandard(field, readerValue, goldValue),
            discordantSegments: isSegment
              ? compareSegmentMaps(
                  readerValue as SegmentValues | undefined,
                  goldValue as SegmentValues | undefined,
                  field.segmentCount === 16 ? 16 : 17,
                ).count
              : null,
          })
        }
      }
    }
  }
  return rows
}

export function comparisonTotals(rows: ComparisonRow[]): { within: number; outside: number } {
  const compared = rows.filter((row) => row.verdict.rule !== 'not_compared')
  return {
    within: compared.filter((row) => row.verdict.withinTolerance).length,
    outside: compared.filter((row) => !row.verdict.withinTolerance).length,
  }
}
