'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SingleSelect } from '@/components/ui/single-select'
import type { FieldDefinition, SequenceDefinition } from '@/lib/corelab/crf/schema'

export type LibraryOption = { id: string; code: string; name: string; type: string; options: string[] }

export type SequenceEdits = {
  rename: (name: string) => void
  remove: () => void
  move: (direction: -1 | 1) => void
  addSection: () => void
  renameSection: (sectionId: string, name: string) => void
  setFields: (sectionId: string, fields: FieldDefinition[]) => void
  editField: (field: FieldDefinition, apply: (next: FieldDefinition) => void) => void
  promote: (field: FieldDefinition) => void
}

type SequenceCardProps = {
  sequence: SequenceDefinition
  edits: SequenceEdits
  libraryVariables: LibraryOption[]
  knownCodes: Set<string>
}

function fieldFromVariable(variable: LibraryOption): FieldDefinition {
  return {
    id: variable.code,
    name: variable.name,
    type: variable.type as FieldDefinition['type'],
    required: false,
    ...(variable.options.length > 0 ? { options: variable.options } : {}),
    ...(variable.type.startsWith('segment_') ? { segmentCount: 17 as const } : {}),
  }
}

function moved<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

export function SequenceCard({ sequence, edits, libraryVariables, knownCodes }: SequenceCardProps) {
  const t = useTranslations('corelab.library.editor')
  const [pick, setPick] = useState<Record<string, string>>({})

  return (
    <div className="rounded-2xl border border-border bg-white p-5" data-testid={`sequence-${sequence.id}`}>
      <div className="flex items-center gap-2">
        <Input
          className="max-w-xs"
          aria-label={t('sequenceName')}
          value={sequence.name}
          onChange={(event) => edits.rename(event.target.value)}
        />
        <Button variant="ghost" size="sm" aria-label={t('moveUp')} onClick={() => edits.move(-1)}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" aria-label={t('moveDown')} onClick={() => edits.move(1)}>
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={edits.remove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {sequence.sections.map((section) => (
        <div key={section.id} className="mt-4 rounded-xl border border-border p-4">
          <Input
            className="max-w-xs"
            aria-label={t('sectionName')}
            value={section.name}
            onChange={(event) => edits.renameSection(section.id, event.target.value)}
          />
          <ul className="mt-2 space-y-1">
            {section.fields.map((field, index) => (
              <li key={field.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-text-primary">
                  {field.name} <span className="text-xs text-text-secondary">{field.type}{field.required ? ' · *' : ''}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="sm" aria-label={t('moveUp')}
                    onClick={() => edits.setFields(section.id, moved(section.fields, index, -1))}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="sm" aria-label={t('moveDown')}
                    onClick={() => edits.setFields(section.id, moved(section.fields, index, 1))}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => edits.editField(field, (next) => edits.setFields(
                      section.id,
                      section.fields.map((existing) => existing.id === field.id ? next : existing),
                    ))}
                  >
                    {t('edit')}
                  </Button>
                  {knownCodes.has(field.id) ? null : (
                    <Button variant="ghost" size="sm" onClick={() => edits.promote(field)}>{t('promote')}</Button>
                  )}
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => edits.setFields(section.id, section.fields.filter((existing) => existing.id !== field.id))}
                  >
                    {t('remove')}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <SingleSelect
              className="w-64"
              placeholder={t('fromLibrary')}
              options={libraryVariables.map((variable) => ({ value: variable.id, label: variable.name }))}
              value={pick[section.id] ?? ''}
              onChange={(value) => {
                const variable = libraryVariables.find((entry) => entry.id === value)
                setPick({ ...pick, [section.id]: value })
                if (variable) edits.setFields(section.id, [...section.fields, fieldFromVariable(variable)])
              }}
            />
          </div>
        </div>
      ))}

      <Button variant="ghost" size="sm" className="mt-3 gap-2" onClick={edits.addSection}>
        <Plus className="h-4 w-4" />{t('addSection')}
      </Button>
    </div>
  )
}
