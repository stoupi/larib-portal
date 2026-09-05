'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SingleSelect } from '@/components/ui/single-select'
import { discardDraftAction, publishDraftAction, saveDraftAction, saveVariableAction, startDraftAction } from '../../../actions-library'
import { SequenceCard, type LibraryOption, type SequenceEdits } from './sequence-card'
import { FieldDialog } from './field-dialog'
import type { CrfDefinition, FieldDefinition, SequenceDefinition } from '@/lib/corelab/crf/schema'
import type { VersionChange } from '@/lib/corelab/crf/diff-versions'

type CrfEditorProps = {
  context: { studyId: string; draftNumber: number | null; publishedNumber: number | null; signedReadings: number }
  definition: CrfDefinition
  changes: VersionChange[]
  worst: 'HARMLESS' | 'CREATES_GAP' | 'BREAKS_READING'
  library: { variables: LibraryOption[]; blocks: Array<{ id: string; name: string; definition: unknown }> }
}

const IMPACT_STYLE: Record<string, string> = {
  HARMLESS: 'text-emerald-700',
  CREATES_GAP: 'text-amber-700',
  BREAKS_READING: 'text-red-600',
}

export function CrfEditor({ context, definition, changes, worst, library }: CrfEditorProps) {
  const t = useTranslations('corelab.library.editor')
  const router = useRouter()
  const [draft, setDraft] = useState<CrfDefinition>(definition)
  const [editing, setEditing] = useState<{ field: FieldDefinition; apply: (next: FieldDefinition) => void } | null>(null)
  const knownCodes = new Set(library.variables.map((variable) => variable.code))

  const promote = useAction(saveVariableAction, {
    onSuccess: () => {
      toast.success(t('promoted'))
      router.refresh()
    },
    onError: () => toast.error(t('emptyDefinition')),
  })

  const start = useAction(startDraftAction, { onSuccess: () => router.refresh(), onError: () => toast.error(t('save')) })
  const save = useAction(saveDraftAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      router.refresh()
    },
    onError: () => toast.error(t('emptyDefinition')),
  })
  const publish = useAction(publishDraftAction, {
    onSuccess: ({ data }) => {
      toast.success(t('published_', { number: data?.number ?? 0 }))
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(String(error.serverError ?? '').startsWith('LOCKED_FIELD_REMOVED') ? t('lockedField') : t('emptyDefinition'))
    },
  })
  const discard = useAction(discardDraftAction, {
    onSuccess: () => {
      toast.success(t('discarded'))
      router.refresh()
    },
    onError: () => toast.error(t('save')),
  })

  if (context.draftNumber === null) {
    return (
      <section className="rounded-2xl border border-border bg-white p-6">
        <p className="text-sm text-text-secondary">
          {context.publishedNumber ? t('published', { number: context.publishedNumber }) : t('noVersion')}
        </p>
        <Button className="mt-4" onClick={() => start.execute({ studyId: context.studyId })}>{t('start')}</Button>
      </section>
    )
  }

  function filled(): CrfDefinition {
    return draft
      .map((sequence) => ({ ...sequence, sections: sequence.sections.filter((section) => section.fields.length > 0) }))
      .filter((sequence) => sequence.sections.length > 0)
  }

  function addSequence() {
    setDraft([...draft, {
      id: `sequence_${draft.length + 1}`,
      name: `Sequence ${draft.length + 1}`,
      sections: [{ id: 'section_1', name: 'Section 1', fields: [] }],
    }])
  }

  function updateSequence(sequenceId: string, apply: (sequence: SequenceDefinition) => SequenceDefinition) {
    setDraft(draft.map((sequence) => sequence.id === sequenceId ? apply(sequence) : sequence))
  }

  function editsFor(sequence: SequenceDefinition, index: number): SequenceEdits {
    return {
      rename: (name) => updateSequence(sequence.id, (entry) => ({ ...entry, name })),
      remove: () => setDraft(draft.filter((entry) => entry.id !== sequence.id)),
      move: (direction) => {
        const target = index + direction
        if (target < 0 || target >= draft.length) return
        const next = [...draft]
        const [moving] = next.splice(index, 1)
        next.splice(target, 0, moving)
        setDraft(next)
      },
      addSection: () => updateSequence(sequence.id, (entry) => ({
        ...entry,
        sections: [...entry.sections, { id: `section_${entry.sections.length + 1}`, name: `Section ${entry.sections.length + 1}`, fields: [] }],
      })),
      renameSection: (sectionId, name) => updateSequence(sequence.id, (entry) => ({
        ...entry,
        sections: entry.sections.map((section) => section.id === sectionId ? { ...section, name } : section),
      })),
      setFields: (sectionId, fields) => updateSequence(sequence.id, (entry) => ({
        ...entry,
        sections: entry.sections.map((section) => section.id === sectionId ? { ...section, fields } : section),
      })),
      editField: (field, apply) => setEditing({ field, apply }),
      promote: (field) => promote.execute({
        code: field.id,
        name: field.name,
        modality: 'CMR',
        type: field.type,
        params: {
          required: field.required,
          ...(field.unit === undefined ? {} : { unit: field.unit }),
          ...(field.min === undefined ? {} : { min: field.min }),
          ...(field.max === undefined ? {} : { max: field.max }),
          ...(field.segmentCount === undefined ? {} : { segmentCount: field.segmentCount }),
        },
        valueSetId: null,
      }),
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-5">
        <div>
          <p className="text-sm font-medium text-text-primary">{t('draft', { number: context.draftNumber })}</p>
          <p className="text-xs text-text-secondary">
            {context.publishedNumber ? t('published', { number: context.publishedNumber }) : t('noVersion')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => save.execute({ studyId: context.studyId, definition: filled() })}>{t('save')}</Button>
          <Button variant="ghost" size="sm" onClick={() => discard.execute({ studyId: context.studyId })}>{t('discard')}</Button>
          <Button size="sm" onClick={() => publish.execute({ studyId: context.studyId })}>{t('publish')}</Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6" data-testid="impact">
        <h3 className="text-base font-semibold text-text-primary">{t('impactTitle')}</h3>
        <p className="mt-1 text-sm text-text-secondary">{t('signedReadings', { count: context.signedReadings })}</p>
        {changes.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">{t('noChange')}</p>
        ) : (
          <>
            <p className={`mt-2 text-sm font-medium ${IMPACT_STYLE[worst]}`} data-testid="worst-impact">{t(`impacts.${worst}`)}</p>
            <ul className="mt-2 space-y-1">
              {changes.map((change) => (
                <li key={`${change.sequenceId}.${change.fieldId}.${change.kind}`} className="text-sm">
                  <span className={IMPACT_STYLE[change.impact]}>{t(`impacts.${change.impact}`)}</span>
                  <span className="ml-2 text-text-secondary">{change.sequenceId}.{change.fieldId} — {change.detail}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-4">
        {draft.map((sequence, index) => (
          <SequenceCard
            key={sequence.id}
            sequence={sequence}
            edits={editsFor(sequence, index)}
            libraryVariables={library.variables}
            knownCodes={knownCodes}
          />
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={addSequence}>
            <Plus className="h-4 w-4" />{t('addSequence')}
          </Button>
          {library.blocks.length === 0 ? null : (
            <SingleSelect
              className="w-72"
              placeholder={t('insertBlock')}
              options={library.blocks.map((block) => ({ value: block.id, label: block.name }))}
              value=""
              onChange={(value) => {
                const block = library.blocks.find((entry) => entry.id === value)
                if (block) setDraft([...draft, block.definition as SequenceDefinition])
              }}
            />
          )}
        </div>
      </section>

      <FieldDialog
        field={editing?.field ?? null}
        onClose={() => setEditing(null)}
        onSave={(next) => {
          editing?.apply(next)
          setEditing(null)
        }}
      />

    </div>
  )
}
