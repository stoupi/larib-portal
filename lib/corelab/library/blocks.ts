import { sectionDefinitionSchema, sequenceDefinitionSchema } from '@/lib/corelab/crf/schema'
import type { FieldDefinition, SectionDefinition, SequenceDefinition } from '@/lib/corelab/crf/schema'

export type BlockDefinition = SectionDefinition | SequenceDefinition

function isSequence(definition: BlockDefinition): definition is SequenceDefinition {
  return 'sections' in definition
}

export function sectionsOf(definition: BlockDefinition): SectionDefinition[] {
  return isSequence(definition) ? definition.sections : [definition]
}

export function fieldsOf(definition: BlockDefinition): FieldDefinition[] {
  return sectionsOf(definition).flatMap((section) => section.fields)
}

export function blockSummary(definition: BlockDefinition): { fields: number; required: number; thresholds: number } {
  const fields = fieldsOf(definition)
  return {
    fields: fields.length,
    required: fields.filter((field) => field.required).length,
    thresholds: fields.filter((field) => field.discordanceThreshold).length,
  }
}

export type DanglingCondition = { fieldId: string; fieldName: string; referenceId: string }

// A block travels alone: a condition pointing outside it silently hides the field forever.
export function danglingConditions(definition: BlockDefinition): DanglingCondition[] {
  const fields = fieldsOf(definition)
  const known = new Set(fields.map((field) => field.id))
  return fields
    .filter((field) => field.conditionalOn && !known.has(field.conditionalOn.fieldId))
    .map((field) => ({
      fieldId: field.id,
      fieldName: field.name,
      referenceId: (field.conditionalOn as { fieldId: string }).fieldId,
    }))
}

export function conditionCandidates(definition: BlockDefinition, exceptFieldId: string): FieldDefinition[] {
  return fieldsOf(definition).filter(
    (field) => field.id !== exceptFieldId && (field.type === 'boolean' || field.type === 'categorical'),
  )
}

export function readBlockDefinition(raw: unknown): BlockDefinition | null {
  const sequence = sequenceDefinitionSchema.safeParse(raw)
  if (sequence.success) return sequence.data
  const section = sectionDefinitionSchema.safeParse(raw)
  return section.success ? section.data : null
}

export type BlockRef = { code: string; name: string; definition: unknown }

export function variableUsage(blocks: BlockRef[]): Map<string, Array<{ code: string; name: string }>> {
  const usage = new Map<string, Array<{ code: string; name: string }>>()
  for (const block of blocks) {
    const definition = readBlockDefinition(block.definition)
    if (!definition) continue
    for (const field of fieldsOf(definition)) {
      const entries = usage.get(field.id) ?? []
      if (entries.some((entry) => entry.code === block.code)) continue
      entries.push({ code: block.code, name: block.name })
      usage.set(field.id, entries)
    }
  }
  return usage
}

export type BlockEntry = { id: string; code: string; name: string; kind: 'SECTION' | 'SEQUENCE'; definition: unknown }
export type BlockGroup = { sequence: BlockEntry | null; sections: BlockEntry[] }

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

// Blocks are stored flat; a section belongs to the sequence whose definition holds it.
export function groupBlocks(blocks: BlockEntry[]): BlockGroup[] {
  const sequences = blocks.filter((block) => block.kind === 'SEQUENCE')
  const sections = blocks.filter((block) => block.kind === 'SECTION')
  const taken = new Set<string>()

  const groups = sequences.map((sequence) => {
    const definition = readBlockDefinition(sequence.definition)
    const owned = new Set(definition ? sectionsOf(definition).map((section) => slug(section.id)) : [])
    const children = sections.filter((section) => owned.has(section.code))
    for (const child of children) taken.add(child.code)
    return { sequence, sections: children }
  })

  const orphans = sections.filter((section) => !taken.has(section.code))
  return orphans.length > 0 ? [...groups, { sequence: null, sections: orphans }] : groups
}
