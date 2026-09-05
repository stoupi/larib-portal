import { z } from 'zod'

export const fieldTypeSchema = z.enum([
  'numeric', 'boolean', 'categorical', 'text', 'segment_categorical', 'segment_numeric', 'series_availability',
])

export const fieldDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  type: fieldTypeSchema,
  required: z.boolean(),
  unit: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.string()).optional(),
  segmentCount: z.union([z.literal(16), z.literal(17)]).optional(),
  conditionalOn: z.object({ fieldId: z.string(), value: z.unknown() }).optional(),
  longitudinal: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  calibrationTolerance: z.object({ absolute: z.number().nonnegative(), relativePercent: z.number().nonnegative() }).optional(),
  valueSetId: z.string().optional(),
  optionColours: z.record(z.string(), z.string()).optional(),
  scale: z.object({ steps: z.number().int().min(2).max(10), render: z.enum(['stars', 'slider', 'buttons']) }).optional(),
}).superRefine((field, context) => {
  if ((field.type === 'categorical' || field.type === 'segment_categorical' || field.type === 'series_availability') && !field.options?.length) {
    context.addIssue({ code: 'custom', message: `${field.id}: options required`, path: ['options'] })
  }
  if (field.type.startsWith('segment_') && !field.segmentCount) {
    context.addIssue({ code: 'custom', message: `${field.id}: segmentCount required`, path: ['segmentCount'] })
  }
  if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
    context.addIssue({ code: 'custom', message: `${field.id}: min > max`, path: ['min'] })
  }
})

export const sectionDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fields: z.array(fieldDefinitionSchema).min(1),
})

export const sequenceDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sections: z.array(sectionDefinitionSchema).min(1),
})

export const crfDefinitionSchema = z.array(sequenceDefinitionSchema).min(1).superRefine((sequences, context) => {
  const seen = new Set<string>()
  for (const sequence of sequences) {
    for (const section of sequence.sections) {
      for (const field of section.fields) {
        const key = `${sequence.id}.${field.id}`
        if (seen.has(key)) context.addIssue({ code: 'custom', message: `duplicate field ${key}` })
        seen.add(key)
      }
    }
  }
})

export const discordanceThresholdSchema = z.object({
  fieldId: z.string(),
  minorPercent: z.number().nonnegative(),
  majorPercent: z.number().nonnegative(),
})
export const discordanceThresholdsSchema = z.array(discordanceThresholdSchema)

export const documentSlotSchema = z.object({
  id: z.string(),
  label: z.string(),
  accept: z.string(),
  required: z.boolean(),
  description: z.string().optional(),
  onUpload: z.literal('import').optional(),
})
export const documentSlotsSchema = z.array(documentSlotSchema)

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>
export type SectionDefinition = z.infer<typeof sectionDefinitionSchema>
export type SequenceDefinition = z.infer<typeof sequenceDefinitionSchema>
export type CrfDefinition = z.infer<typeof crfDefinitionSchema>
export type DiscordanceThreshold = z.infer<typeof discordanceThresholdSchema>
export type DocumentSlot = z.infer<typeof documentSlotSchema>

export function parseCrfDefinition(value: unknown): CrfDefinition {
  return crfDefinitionSchema.parse(value)
}

export function findField(definition: CrfDefinition, sequenceId: string, fieldId: string): FieldDefinition | null {
  const sequence = definition.find((candidate) => candidate.id === sequenceId)
  if (!sequence) return null
  for (const section of sequence.sections) {
    const field = section.fields.find((candidate) => candidate.id === fieldId)
    if (field) return field
  }
  return null
}
