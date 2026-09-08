import { variableToFieldDefinition, type LibraryVariableShape, type ValueSetItemShape } from './params'
import type { FieldDefinition } from '@/lib/corelab/crf/schema'

export type ReferenceVariable = LibraryVariableShape & { valueSet: { id: string } | null }
export type ReferenceValueSet = { id: string; items: ValueSetItemShape[] }

// The library is the reference a CRF field is measured against; a variable that no
// longer parses is left out rather than counted as a divergence.
export function buildReferences(
  variables: ReferenceVariable[],
  valueSets: ReferenceValueSet[],
): Map<string, FieldDefinition> {
  const itemsOf = new Map(valueSets.map((valueSet) => [valueSet.id, valueSet.items]))
  const references = new Map<string, FieldDefinition>()
  for (const variable of variables) {
    const items = itemsOf.get(variable.valueSet?.id ?? '') ?? []
    try {
      references.set(variable.code, variableToFieldDefinition(variable, items))
    } catch {
      continue
    }
  }
  return references
}
