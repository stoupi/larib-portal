export type { CrfDefinition, FieldDefinition, SectionDefinition, SequenceDefinition, DiscordanceThreshold, DocumentSlot } from '@/lib/corelab/crf/schema'
export type { AccessPeriodSummary } from '@/lib/permissions'

export type FieldValue = {
  value: unknown
  source: 'MANUAL' | 'IMPORTED' | 'MODIFIED'
  flag?: 'UNCERTAIN_VALUE' | 'POOR_IMAGE_QUALITY' | 'MEASUREMENT_DIFFICULT' | 'OTHER' | null
  flagNote?: string | null
}
export type SegmentValues = Record<string, unknown>
export type SequenceValues = Record<string, FieldValue>
export type ExamValues = Record<string, SequenceValues>
export type ReadingValues = Record<string, ExamValues>
export type SequenceFlagValue = { category: 'NOT_ANALYZABLE' | 'ARTEFACTS_SEVERE' | 'SOFTWARE_ERROR' | 'OTHER'; note: string }
export type CrfFormMode = 'reading' | 'calibration' | 'gold_standard' | 'review' | 'preview'
export type FieldChange = { examId: string; sequenceId: string; fieldId: string; value: FieldValue | null }
