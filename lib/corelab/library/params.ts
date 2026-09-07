import { z } from 'zod'
import { fieldDefinitionSchema, type FieldDefinition } from '@/lib/corelab/crf/schema'

export const variableParamsSchema = z.object({
  required: z.boolean().default(false),
  unit: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  segmentCount: z.union([z.literal(16), z.literal(17)]).optional(),
  calibrationTolerance: z.object({ absolute: z.number().nonnegative(), relativePercent: z.number().nonnegative() }).optional(),
  discordanceThreshold: z.object({ minorPercent: z.number().nonnegative(), majorPercent: z.number().nonnegative() }).optional(),
  defaultValue: z.unknown().optional(),
  conditionalOn: z.object({ fieldId: z.string(), value: z.unknown() }).optional(),
  scale: z.object({ steps: z.number().int().min(2).max(10), render: z.enum(['stars', 'slider', 'buttons']) }).optional(),
})

export type VariableParams = z.infer<typeof variableParamsSchema>

export function parseVariableParams(raw: unknown): VariableParams {
  const parsed = variableParamsSchema.safeParse(raw ?? {})
  return parsed.success ? parsed.data : { required: false }
}

export type LibraryVariableShape = {
  code: string
  name: string
  type: string
  params: unknown
}

export type ValueSetItemShape = {
  code: string
  label: string
  colour: string | null
}

export function variableToFieldDefinition(
  variable: LibraryVariableShape,
  items: ValueSetItemShape[],
): FieldDefinition {
  const params = parseVariableParams(variable.params)
  const colours = Object.fromEntries(
    items.filter((item) => item.colour).map((item) => [item.label, item.colour as string]),
  )
  return fieldDefinitionSchema.parse({
    id: variable.code,
    name: variable.name,
    type: variable.type,
    required: params.required,
    ...(params.unit !== undefined ? { unit: params.unit } : {}),
    ...(params.min !== undefined ? { min: params.min } : {}),
    ...(params.max !== undefined ? { max: params.max } : {}),
    ...(params.segmentCount !== undefined ? { segmentCount: params.segmentCount } : {}),
    ...(params.calibrationTolerance ? { calibrationTolerance: params.calibrationTolerance } : {}),
    ...(params.discordanceThreshold ? { discordanceThreshold: params.discordanceThreshold } : {}),
    ...(params.defaultValue !== undefined ? { defaultValue: params.defaultValue } : {}),
    ...(params.conditionalOn ? { conditionalOn: params.conditionalOn } : {}),
    ...(params.scale ? { scale: params.scale } : {}),
    ...(items.length > 0
      ? { options: items.map((item) => item.label), ...(Object.keys(colours).length > 0 ? { optionColours: colours } : {}) }
      : {}),
  })
}

export function fieldToVariableParams(field: FieldDefinition): VariableParams {
  return {
    required: field.required,
    ...(field.unit !== undefined ? { unit: field.unit } : {}),
    ...(field.min !== undefined ? { min: field.min } : {}),
    ...(field.max !== undefined ? { max: field.max } : {}),
    ...(field.segmentCount !== undefined ? { segmentCount: field.segmentCount } : {}),
    ...(field.calibrationTolerance ? { calibrationTolerance: field.calibrationTolerance } : {}),
    ...(field.discordanceThreshold ? { discordanceThreshold: field.discordanceThreshold } : {}),
    ...(field.defaultValue !== undefined ? { defaultValue: field.defaultValue } : {}),
    ...(field.conditionalOn ? { conditionalOn: field.conditionalOn } : {}),
    ...(field.scale ? { scale: field.scale } : {}),
  }
}
