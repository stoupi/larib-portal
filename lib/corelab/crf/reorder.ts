import type { CrfDefinition, FieldDefinition, SectionDefinition, SequenceDefinition } from './schema'

export function moved<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return [...items]
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function movePart(definition: CrfDefinition, partId: string, targetIndex: number): CrfDefinition {
  return moved(definition, definition.findIndex((part) => part.id === partId), targetIndex)
}

function withoutSection(part: SequenceDefinition, sectionId: string): SequenceDefinition {
  return { ...part, sections: part.sections.filter((section) => section.id !== sectionId) }
}

function findSection(definition: CrfDefinition, sectionId: string): SectionDefinition | null {
  for (const part of definition) {
    const section = part.sections.find((candidate) => candidate.id === sectionId)
    if (section) return section
  }
  return null
}

// Only the part the section just left is pruned: a part created empty on purpose stays.
export function moveSection(
  definition: CrfDefinition,
  sectionId: string,
  targetPartId: string,
  targetIndex: number,
): CrfDefinition {
  const section = findSection(definition, sectionId)
  if (!section) return definition
  const sourceId = definition.find((part) => part.sections.some((entry) => entry.id === sectionId))?.id

  return definition
    .map((part) => {
      const trimmed = withoutSection(part, sectionId)
      if (part.id !== targetPartId) return trimmed
      const at = Math.max(0, Math.min(targetIndex, trimmed.sections.length))
      return { ...trimmed, sections: [...trimmed.sections.slice(0, at), section, ...trimmed.sections.slice(at)] }
    })
    .filter((part) => part.id !== sourceId || part.id === targetPartId || part.sections.length > 0)
}

export function moveField(
  definition: CrfDefinition,
  sectionId: string,
  fieldId: string,
  targetIndex: number,
): CrfDefinition {
  return definition.map((part) => ({
    ...part,
    sections: part.sections.map((section) => {
      if (section.id !== sectionId) return section
      return { ...section, fields: moved(section.fields, section.fields.findIndex((field) => field.id === fieldId), targetIndex) }
    }),
  }))
}

export function uniqueId(taken: readonly string[], base: string): string {
  if (!taken.includes(base)) return base
  let index = 2
  while (taken.includes(`${base}_${index}`)) index += 1
  return `${base}_${index}`
}

export function partIds(definition: CrfDefinition): string[] {
  return definition.map((part) => part.id)
}

export function sectionIds(definition: CrfDefinition): string[] {
  return definition.flatMap((part) => part.sections.map((section) => section.id))
}

// A field identifier only has to be unique inside its part: that is what the export keys on.
export function fieldIdsOfPart(part: SequenceDefinition): string[] {
  return part.sections.flatMap((section) => section.fields.map((field) => field.id))
}

export function insertField(
  definition: CrfDefinition,
  sectionId: string,
  field: FieldDefinition,
  afterFieldId: string | null,
): CrfDefinition {
  return definition.map((part) => ({
    ...part,
    sections: part.sections.map((section) => {
      if (section.id !== sectionId) return section
      const at = afterFieldId === null ? -1 : section.fields.findIndex((entry) => entry.id === afterFieldId)
      const index = at < 0 ? section.fields.length : at + 1
      return { ...section, fields: [...section.fields.slice(0, index), field, ...section.fields.slice(index)] }
    }),
  }))
}

export function replaceField(
  definition: CrfDefinition,
  sectionId: string,
  fieldId: string,
  next: FieldDefinition,
): CrfDefinition {
  return definition.map((part) => ({
    ...part,
    sections: part.sections.map((section) => {
      if (section.id !== sectionId) return section
      return { ...section, fields: section.fields.map((field) => (field.id === fieldId ? next : field)) }
    }),
  }))
}

// Only the section the variable just left is pruned, and its part with it if it was the last.
export function removeField(definition: CrfDefinition, sectionId: string, fieldId: string): CrfDefinition {
  const emptied = definition.some((part) =>
    part.sections.some((section) => section.id === sectionId && section.fields.length === 1 && section.fields[0].id === fieldId),
  )
  return definition
    .map((part) => ({
      ...part,
      sections: part.sections
        .map((section) => {
          if (section.id !== sectionId) return section
          return { ...section, fields: section.fields.filter((field) => field.id !== fieldId) }
        })
        .filter((section) => section.id !== sectionId || section.fields.length > 0),
    }))
    .filter((part) => !emptied || part.sections.length > 0)
}

// The draft may hold a part or a section still being filled; the schema may not.
export function publishable(definition: CrfDefinition): CrfDefinition {
  return definition
    .map((part) => ({ ...part, sections: part.sections.filter((section) => section.fields.length > 0) }))
    .filter((part) => part.sections.length > 0)
}

export function insertSection(
  definition: CrfDefinition,
  partId: string,
  section: SectionDefinition,
  afterSectionId: string | null,
): CrfDefinition {
  return definition.map((part) => {
    if (part.id !== partId) return part
    const at = afterSectionId === null ? -1 : part.sections.findIndex((entry) => entry.id === afterSectionId)
    const index = at < 0 ? part.sections.length : at + 1
    return { ...part, sections: [...part.sections.slice(0, index), section, ...part.sections.slice(index)] }
  })
}
