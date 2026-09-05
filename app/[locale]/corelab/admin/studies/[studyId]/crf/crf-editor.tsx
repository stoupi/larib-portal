'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SingleSelect } from '@/components/ui/single-select'
import { discardDraftAction, publishDraftAction, saveDraftAction, startDraftAction } from '../../../actions-library'
import type { CrfDefinition } from '@/lib/corelab/crf/schema'
import type { VersionChange } from '@/lib/corelab/crf/diff-versions'

type LibraryOption = { id: string; code: string; name: string; type: string; options: string[] }

type CrfEditorProps = {
  context: { studyId: string; draftNumber: number | null; publishedNumber: number | null; signedReadings: number }
  definition: CrfDefinition
  changes: VersionChange[]
  worst: 'HARMLESS' | 'CREATES_GAP' | 'BREAKS_READING'
  libraryVariables: LibraryOption[]
}

const IMPACT_STYLE: Record<string, string> = {
  HARMLESS: 'text-emerald-700',
  CREATES_GAP: 'text-amber-700',
  BREAKS_READING: 'text-red-600',
}

export function CrfEditor({ context, definition, changes, worst, libraryVariables }: CrfEditorProps) {
  const t = useTranslations('corelab.library.editor')
  const router = useRouter()
  const [draft, setDraft] = useState<CrfDefinition>(definition)
  const [pick, setPick] = useState<Record<string, string>>({})

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

  function addSequence() {
    setDraft([...draft, { id: `sequence_${draft.length + 1}`, name: `Sequence ${draft.length + 1}`, sections: [{ id: 'section_1', name: 'Section 1', fields: [] }] }])
  }

  function addVariable(sequenceId: string, sectionId: string, variableId: string) {
    const variable = libraryVariables.find((entry) => entry.id === variableId)
    if (!variable) return
    setDraft(draft.map((sequence) => sequence.id !== sequenceId ? sequence : {
      ...sequence,
      sections: sequence.sections.map((section) => section.id !== sectionId ? section : {
        ...section,
        fields: [
          ...section.fields,
          {
            id: variable.code,
            name: variable.name,
            type: variable.type as 'numeric',
            required: false,
            ...(variable.options.length > 0 ? { options: variable.options } : {}),
            ...(variable.type.startsWith('segment_') ? { segmentCount: 17 as const } : {}),
          },
        ],
      }),
    }))
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
          <Button variant="outline" size="sm" onClick={() => save.execute({ studyId: context.studyId, definition: draft })}>{t('save')}</Button>
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
        {draft.map((sequence) => (
          <div key={sequence.id} className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-2">
              <Input
                className="max-w-xs"
                aria-label={t('sequenceName')}
                value={sequence.name}
                onChange={(event) => setDraft(draft.map((entry) => entry.id === sequence.id ? { ...entry, name: event.target.value } : entry))}
              />
              <Button variant="ghost" size="sm" onClick={() => setDraft(draft.filter((entry) => entry.id !== sequence.id))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {sequence.sections.map((section) => (
              <div key={section.id} className="mt-4 rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-text-primary">{section.name}</p>
                <ul className="mt-2 space-y-1">
                  {section.fields.map((field) => (
                    <li key={field.id} className="flex items-center justify-between text-sm">
                      <span className="text-text-primary">{field.name} <span className="text-xs text-text-secondary">{field.type}</span></span>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setDraft(draft.map((entry) => entry.id !== sequence.id ? entry : {
                          ...entry,
                          sections: entry.sections.map((candidate) => candidate.id !== section.id ? candidate : {
                            ...candidate,
                            fields: candidate.fields.filter((existing) => existing.id !== field.id),
                          }),
                        }))}
                      >
                        {t('remove')}
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center gap-2">
                  <SingleSelect
                    className="w-64"
                    placeholder={t('fromLibrary')}
                    options={libraryVariables.map((variable) => ({ value: variable.id, label: variable.name }))}
                    value={pick[`${sequence.id}.${section.id}`] ?? ''}
                    onChange={(value) => {
                      setPick({ ...pick, [`${sequence.id}.${section.id}`]: value })
                      addVariable(sequence.id, section.id, value)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
        <Button variant="outline" className="gap-2" onClick={addSequence}>
          <Plus className="h-4 w-4" />{t('addSequence')}
        </Button>
      </section>
    </div>
  )
}
