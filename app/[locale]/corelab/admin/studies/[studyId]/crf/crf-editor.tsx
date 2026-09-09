'use client'

import { useMemo, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { fieldToVariableParams } from '@/lib/corelab/library/params'
import { referenceOf, revertToReference, sectionDrift, sectionOrigin } from '@/lib/corelab/crf/origin'
import {
  fieldIdsOfPart,
  insertField,
  insertSection,
  movePart,
  moveSection,
  partIds,
  publishable,
  removeField,
  removePart,
  removeSection,
  renamePart,
  renameSection,
  replaceField,
  sectionIds,
  uniqueId,
} from '@/lib/corelab/crf/reorder'
import { discardDraftAction, publishDraftAction, saveDraftAction, saveVariableAction, startDraftAction } from '../../../actions-library'
import { PaneFrame } from '@/app/[locale]/corelab/components/crf/pane-chrome'
import { CrfCommandBar } from './crf-command-bar'
import { CrfPlan } from './crf-plan'
import { blockCodeOf } from '@/lib/corelab/library/blocks'
import { CrfBlockPicker, type LibraryBlockOption } from './crf-block-picker'
import { CrfForm } from './crf-form'
import { CrfInspector } from './crf-inspector'
import { CrfAddPanel } from './crf-add-panel'
import { slugify } from '@/lib/corelab/crf/identifier'
import { CrfImpactPanel } from './crf-impact-panel'
import type { CrfDefinition, FieldDefinition, SectionDefinition, SequenceDefinition } from '@/lib/corelab/crf/schema'
import type { ChangeImpact, VersionChange } from '@/lib/corelab/crf/diff-versions'
import type { CorelabModality } from '@/app/generated/prisma'

type Panel = 'field' | 'add' | 'impact'

export type EditorContext = {
  studyId: string
  draftNumber: number | null
  publishedNumber: number | null
  modality: CorelabModality
}

function newSection(taken: string[]): SectionDefinition {
  return { id: uniqueId(taken, 'section'), name: 'New section', fields: [] }
}

function newPart(taken: string[], sectionTaken: string[]): SequenceDefinition {
  return { id: uniqueId(taken, 'part'), name: 'New part', sections: [newSection(sectionTaken)] }
}

function blankField(): FieldDefinition {
  return { id: '', name: '', type: 'numeric', required: false }
}

export function CrfEditor({ context, definition, impact, library }: {
  context: EditorContext
  definition: CrfDefinition
  impact: { changes: VersionChange[]; worst: ChangeImpact; signedReadings: number }
  library: { references: Array<[string, FieldDefinition]>; ids: Array<[string, string]>; blocks: LibraryBlockOption[] }
}) {
  const t = useTranslations('corelab.crfEditor')
  const router = useRouter()
  const references = useMemo(() => new Map(library.references), [library.references])
  const libraryIds = useMemo(() => new Map(library.ids), [library.ids])
  const blocksByCode = useMemo(
    () => new Map(library.blocks.map((block) => [blockCodeOf(block.code), block.definition])),
    [library.blocks],
  )

  const [draft, setDraft] = useState<CrfDefinition>(definition)
  const [sectionId, setSectionId] = useState(definition[0]?.sections[0]?.id ?? '')
  const [fieldId, setFieldId] = useState(definition[0]?.sections[0]?.fields[0]?.id ?? '')
  const [openParts, setOpenParts] = useState<Record<string, boolean>>(() =>
    definition[0] ? { [definition[0].id]: true } : {},
  )
  const [rail, setRail] = useState<'plan' | 'library'>('plan')
  const [panel, setPanel] = useState<Panel>('field')
  const [addTab, setAddTab] = useState<'library' | 'create'>('library')
  const [pendingField, setPendingField] = useState<FieldDefinition | null>(null)

  const start = useAction(startDraftAction, { onSuccess: () => router.refresh(), onError: () => toast.error(t('saveFailed')) })
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
    onError: () => toast.error(t('saveFailed')),
  })
  const promote = useAction(saveVariableAction, {
    onSuccess: () => {
      toast.success(t('promoted'))
      router.refresh()
    },
    onError: () => toast.error(t('saveFailed')),
  })

  if (context.draftNumber === null) {
    return (
      <section className="rounded-2xl border border-border bg-white p-6">
        <p className="text-sm text-text-secondary">
          {context.publishedNumber === null
            ? t('noVersion')
            : t('publishedOnly', { number: context.publishedNumber })}
        </p>
        <Button className="mt-4" onClick={() => start.execute({ studyId: context.studyId })}>{t('start')}</Button>
      </section>
    )
  }

  const part = draft.find((entry) => entry.sections.some((section) => section.id === sectionId)) ?? draft[0] ?? null
  const section = part?.sections.find((entry) => entry.id === sectionId) ?? part?.sections[0] ?? null
  const field = section?.fields.find((entry) => entry.id === fieldId) ?? section?.fields[0] ?? null
  const drift = draft.reduce(
    (total, entry) => total + entry.sections.reduce((count, item) => count + sectionDrift(item, references), 0),
    0,
  )

  function select(nextSectionId: string, nextFieldId?: string) {
    const nextSection = draft.flatMap((entry) => entry.sections).find((entry) => entry.id === nextSectionId)
    setSectionId(nextSectionId)
    setFieldId(nextFieldId ?? nextSection?.fields[0]?.id ?? '')
    setPanel('field')
    setPendingField(null)
  }

  function insertLibraryField(source: FieldDefinition) {
    if (!part || !section) return
    const copy = { ...source, id: uniqueId(fieldIdsOfPart(part), source.id) }
    setDraft(insertField(draft, section.id, copy, field?.id ?? null))
    setFieldId(copy.id)
  }

  function commitPendingField() {
    if (!part || !section || !pendingField) return
    const name = pendingField.name.trim() === '' ? 'New variable' : pendingField.name.trim()
    const base = pendingField.id.trim() === '' ? slugify(name) : pendingField.id.trim()
    const created: FieldDefinition = {
      ...pendingField,
      name,
      id: uniqueId(fieldIdsOfPart(part), base || 'variable'),
      ...(pendingField.options && pendingField.options.length === 0 ? { options: ['To define'] } : {}),
    }
    setDraft(insertField(draft, section.id, created, field?.id ?? null))
    setFieldId(created.id)
    setPendingField(null)
    setPanel('field')
  }

  function changeField(next: FieldDefinition) {
    if (!section || !field) return
    setDraft(replaceField(draft, section.id, field.id, next))
    setFieldId(next.id)
  }

  function sectionBlockOf(id: string) {
    const block = blocksByCode.get(blockCodeOf(id))
    return block && !('sections' in block) ? block : null
  }

  const reference = field ? referenceOf(field, references) : null

  return (
    <PaneFrame
      header={
        <CrfCommandBar
          version={{ draftNumber: context.draftNumber, publishedNumber: context.publishedNumber }}
          impact={{
            signedReadings: impact.signedReadings,
            changes: impact.changes.length,
            worst: impact.worst,
            open: panel === 'impact',
          }}
          pending={save.isPending || publish.isPending || discard.isPending}
          actions={{
            openImpact: () => setPanel(panel === 'impact' ? 'field' : 'impact'),
            save: () => save.execute({ studyId: context.studyId, definition: publishable(draft) }),
            discard: () => discard.execute({ studyId: context.studyId }),
            publish: () => publish.execute({ studyId: context.studyId }),
          }}
        />
  
      }
      rail={
        <>
              {rail === 'plan' ? (
                <CrfPlan
                  definition={draft}
                  library={{ references, blocks: blocksByCode }}
                  view={{ sectionId: section?.id ?? '', openParts }}
                  actions={{
                    selectSection: (id) => select(id),
                    togglePart: (id) => {
                      const host = draft.find((entry) => entry.id === id)
                      setOpenParts({ ...openParts, [id]: !(openParts[id] ?? false) })
                      if (host?.sections[0]) select(host.sections[0].id)
                    },
                    movePart: (id, index) => setDraft(movePart(draft, id, index)),
                    moveSection: (id, partId, index) => {
                      setDraft(moveSection(draft, id, partId, index))
                      setOpenParts({ ...openParts, [partId]: true })
                      select(id)
                    },
                    removePart: (id) => {
                      const next = removePart(draft, id)
                      setDraft(next)
                      select(next[0]?.sections[0]?.id ?? '')
                    },
                    removeSection: (id) => {
                      const next = removeSection(draft, id)
                      setDraft(next)
                      const stillThere = next.flatMap((entry) => entry.sections).some((entry) => entry.id === section?.id)
                      if (!stillThere) select(next[0]?.sections[0]?.id ?? '')
                    },
                    openLibrary: () => setRail('library'),
                    addEmptyPart: () => {
                      const created = newPart(partIds(draft), sectionIds(draft))
                      setDraft([...draft, created])
                      setOpenParts({ ...openParts, [created.id]: true })
                      select(created.sections[0].id)
                    },
                  }}
                />
              ) : (
                <CrfBlockPicker
                  blocks={library.blocks}
                  modality={context.modality}
                  sectionName={section?.name ?? ''}
                  onClose={() => setRail('plan')}
                  onInsert={(block) => {
                    if (!part) return
                    if ('sections' in block.definition) {
                      const created = { ...block.definition, id: uniqueId(partIds(draft), block.definition.id) }
                      setDraft([...draft, created])
                      setOpenParts({ ...openParts, [created.id]: true })
                      select(created.sections[0]?.id ?? '')
                    } else {
                      const created = { ...block.definition, id: uniqueId(sectionIds(draft), block.definition.id) }
                      setDraft(insertSection(draft, part.id, created, section?.id ?? null))
                      select(created.id)
                    }
                    setRail('plan')
                  }}
                />
              )}
        </>
      }
      main={
        <>
              {part && section ? (
                <CrfForm
                  part={part}
                  section={section}
                  references={references}
                  view={{
                    fieldId: field?.id ?? '',
                    ghost: panel === 'add' && addTab === 'create' ? pendingField : null,
                    origin: sectionOrigin(section, sectionBlockOf(section.id), references),
                  }}
                  actions={{
                    selectField: (id) => {
                      setFieldId(id)
                      setPanel('field')
                      setPendingField(null)
                    },
                    openAdd: () => {
                      setPanel(panel === 'add' ? 'field' : 'add')
                      setAddTab('library')
                    },
                    renamePart: (name) => setDraft(renamePart(draft, part.id, name)),
                    renameSection: (name) => setDraft(renameSection(draft, section.id, name)),
                  }}
                />
              ) : (
                <p className="p-6 text-sm text-text-secondary">{t('emptyCrf')}</p>
              )}
        </>
      }
      inspector={
        <>
              {panel === 'impact' ? (
                <CrfImpactPanel
                  changes={impact.changes}
                  context={{
                    signedReadings: impact.signedReadings,
                    publishedNumber: context.publishedNumber,
                    drift,
                    modality: context.modality,
                  }}
                  onClose={() => setPanel('field')}
                />
              ) : null}
    
              {panel === 'add' && section ? (
                <CrfAddPanel
                  candidates={[...references.values()].filter(
                    (candidate) => !(part ? fieldIdsOfPart(part) : []).includes(candidate.id),
                  )}
                  draft={pendingField}
                  context={{
                    sectionName: section.name,
                    fieldName: field?.name ?? null,
                    modality: context.modality,
                    tab: addTab,
                  }}
                  actions={{
                    insert: insertLibraryField,
                    setTab: (tab) => {
                      setAddTab(tab)
                      if (tab === 'create' && !pendingField) setPendingField(blankField())
                    },
                    setDraft: setPendingField,
                    commit: commitPendingField,
                    close: () => {
                      setPanel('field')
                      setPendingField(null)
                    },
                  }}
                />
              ) : null}
    
              {panel === 'field' && section && field ? (
                <CrfInspector
                  field={field}
                  reference={reference}
                  section={section}
                  modality={context.modality}
                  actions={{
                    change: changeField,
                    revert: () => {
                      if (reference) changeField(revertToReference(field, reference))
                    },
                    promote: () =>
                      promote.execute({
                        ...(libraryIds.has(field.id) ? { variableId: libraryIds.get(field.id) } : {}),
                        code: field.id,
                        name: field.name,
                        modality: context.modality,
                        type: field.type,
                        params: fieldToVariableParams(field),
                        valueSetId: null,
                      }),
                    remove: () => {
                      const next = removeField(draft, section.id, field.id)
                      setDraft(next)
                      const stillThere = next.flatMap((entry) => entry.sections).find((entry) => entry.id === section.id)
                      select(stillThere?.id ?? next[0]?.sections[0]?.id ?? '')
                    },
                  }}
                />
              ) : null}
        </>
      }
    />
  )
}
