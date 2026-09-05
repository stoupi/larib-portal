import { prisma } from '@/lib/prisma'
import { toJsonValue } from '@/lib/corelab/crf/json'
import { fieldDefinitionSchema, sectionDefinitionSchema, sequenceDefinitionSchema, type FieldDefinition } from '@/lib/corelab/crf/schema'
import type { CorelabLibraryBlockKind, CorelabModality, Prisma } from '@/app/generated/prisma'

const VALUE_SET_SELECT = {
  id: true, code: true, name: true, modality: true, description: true, deprecated: true,
  items: { select: { id: true, code: true, label: true, colour: true, order: true, deprecated: true }, orderBy: { order: 'asc' } },
  _count: { select: { variables: true } },
} satisfies Prisma.CorelabValueSetSelect

export type ValueSet = Prisma.CorelabValueSetGetPayload<{ select: typeof VALUE_SET_SELECT }>

export async function listValueSets(modality?: CorelabModality): Promise<ValueSet[]> {
  return prisma.corelabValueSet.findMany({
    where: modality ? { modality } : undefined,
    select: VALUE_SET_SELECT,
    orderBy: { name: 'asc' },
  })
}

export type ValueSetInput = {
  code: string
  name: string
  modality: CorelabModality
  description: string
  items: Array<{ code: string; label: string; colour?: string | null; order: number }>
}

export async function saveValueSet(input: ValueSetInput, valueSetId?: string): Promise<{ id: string }> {
  if (!valueSetId) {
    return prisma.corelabValueSet.create({
      data: {
        code: input.code, name: input.name, modality: input.modality, description: input.description,
        items: { create: input.items.map((item) => ({ ...item, colour: item.colour ?? null })) },
      },
      select: { id: true },
    })
  }

  await prisma.corelabValueSet.update({
    where: { id: valueSetId },
    data: { name: input.name, description: input.description },
    select: { id: true },
  })

  const existing = await prisma.corelabValueSetItem.findMany({
    where: { valueSetId },
    select: { id: true, code: true },
  })
  const wanted = new Set(input.items.map((item) => item.code))

  // A value in use by a signed reading is never deleted, only deprecated.
  for (const item of existing.filter((entry) => !wanted.has(entry.code))) {
    const used = await valueIsSigned(valueSetId, item.code)
    if (used) {
      await prisma.corelabValueSetItem.update({ where: { id: item.id }, data: { deprecated: true }, select: { id: true } })
      continue
    }
    await prisma.corelabValueSetItem.delete({ where: { id: item.id } })
  }

  for (const item of input.items) {
    const match = existing.find((entry) => entry.code === item.code)
    if (match) {
      await prisma.corelabValueSetItem.update({
        where: { id: match.id },
        data: { label: item.label, colour: item.colour ?? null, order: item.order, deprecated: false },
        select: { id: true },
      })
      continue
    }
    await prisma.corelabValueSetItem.create({
      data: { valueSetId, code: item.code, label: item.label, colour: item.colour ?? null, order: item.order },
      select: { id: true },
    })
  }

  return { id: valueSetId }
}

export async function valueIsSigned(valueSetId: string, code: string): Promise<boolean> {
  const variables = await prisma.corelabLibraryVariable.findMany({
    where: { valueSetId },
    select: { code: true },
  })
  if (variables.length === 0) return false
  const submissions = await prisma.corelabReadingSubmission.findMany({ select: { snapshot: true }, take: 500 })
  const needle = JSON.stringify(code)
  return submissions.some((submission) => JSON.stringify(submission.snapshot).includes(needle))
}

const VARIABLE_SELECT = {
  id: true, code: true, name: true, modality: true, type: true, params: true, deprecated: true,
  valueSet: { select: { id: true, name: true } },
} satisfies Prisma.CorelabLibraryVariableSelect

export type LibraryVariable = Prisma.CorelabLibraryVariableGetPayload<{ select: typeof VARIABLE_SELECT }>

export async function listVariables(modality?: CorelabModality): Promise<LibraryVariable[]> {
  return prisma.corelabLibraryVariable.findMany({
    where: modality ? { modality } : undefined,
    select: VARIABLE_SELECT,
    orderBy: { name: 'asc' },
  })
}

export async function saveVariable(
  input: { code: string; name: string; modality: CorelabModality; type: string; params: unknown; valueSetId: string | null },
  variableId?: string,
): Promise<{ id: string }> {
  const data = {
    code: input.code, name: input.name, modality: input.modality, type: input.type,
    params: toJsonValue(input.params), valueSetId: input.valueSetId,
  }
  if (variableId) {
    return prisma.corelabLibraryVariable.update({ where: { id: variableId }, data, select: { id: true } })
  }
  return prisma.corelabLibraryVariable.create({ data, select: { id: true } })
}

const BLOCK_SELECT = {
  id: true, code: true, name: true, kind: true, modality: true, definition: true, deprecated: true,
} satisfies Prisma.CorelabLibraryBlockSelect

export type LibraryBlock = Prisma.CorelabLibraryBlockGetPayload<{ select: typeof BLOCK_SELECT }>

export async function listBlocks(kind?: CorelabLibraryBlockKind, modality?: CorelabModality): Promise<LibraryBlock[]> {
  return prisma.corelabLibraryBlock.findMany({
    where: { ...(kind ? { kind } : {}), ...(modality ? { modality } : {}) },
    select: BLOCK_SELECT,
    orderBy: { name: 'asc' },
  })
}

export async function saveBlock(
  input: { code: string; name: string; kind: CorelabLibraryBlockKind; modality: CorelabModality; definition: unknown },
  blockId?: string,
): Promise<{ id: string }> {
  const parsed = input.kind === 'SEQUENCE'
    ? sequenceDefinitionSchema.parse(input.definition)
    : sectionDefinitionSchema.parse(input.definition)
  const data = { code: input.code, name: input.name, kind: input.kind, modality: input.modality, definition: toJsonValue(parsed) }
  if (blockId) return prisma.corelabLibraryBlock.update({ where: { id: blockId }, data, select: { id: true } })
  return prisma.corelabLibraryBlock.create({ data, select: { id: true } })
}

// Inserting from the library copies: the study CRF never points back at it.
export function variableToField(variable: LibraryVariable, items: Array<{ code: string; label: string; colour: string | null }>): FieldDefinition {
  const params = (variable.params ?? {}) as Record<string, unknown>
  const candidate = {
    id: variable.code,
    name: variable.name,
    type: variable.type,
    required: params.required === true,
    ...(typeof params.unit === 'string' ? { unit: params.unit } : {}),
    ...(typeof params.min === 'number' ? { min: params.min } : {}),
    ...(typeof params.max === 'number' ? { max: params.max } : {}),
    ...(typeof params.segmentCount === 'number' ? { segmentCount: params.segmentCount } : {}),
    ...(items.length > 0
      ? {
          options: items.map((item) => item.label),
          optionColours: Object.fromEntries(items.filter((item) => item.colour).map((item) => [item.label, item.colour as string])),
        }
      : {}),
  }
  return fieldDefinitionSchema.parse(candidate)
}
