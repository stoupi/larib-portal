'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { sectionDrift } from '@/lib/corelab/crf/origin'
import { GripIcon, MoveButtons, OriginTag, PaneBand } from './crf-chrome'
import type { CrfDefinition, FieldDefinition } from '@/lib/corelab/crf/schema'

type DragTarget = { kind: 'part'; id: string } | { kind: 'section'; id: string }

export type PlanActions = {
  selectSection: (sectionId: string) => void
  togglePart: (partId: string) => void
  movePart: (partId: string, index: number) => void
  moveSection: (sectionId: string, partId: string, index: number) => void
  openLibrary: () => void
  addEmptyPart: () => void
}

export function CrfPlan({ definition, references, sectionId, openParts, actions }: {
  definition: CrfDefinition
  references: Map<string, FieldDefinition>
  sectionId: string
  openParts: Record<string, boolean>
  actions: PlanActions
}) {
  const t = useTranslations('corelab.crfEditor')
  const [dragging, setDragging] = useState<DragTarget | null>(null)
  const [over, setOver] = useState<string | null>(null)

  const variables = definition.reduce(
    (total, part) => total + part.sections.reduce((count, section) => count + section.fields.length, 0),
    0,
  )

  function drop(target: DragTarget) {
    if (!dragging) return
    if (dragging.kind === 'part' && target.kind === 'part') {
      actions.movePart(dragging.id, definition.findIndex((part) => part.id === target.id))
    }
    if (dragging.kind === 'section' && target.kind === 'section') {
      const host = definition.find((part) => part.sections.some((section) => section.id === target.id))
      if (host) actions.moveSection(dragging.id, host.id, host.sections.findIndex((section) => section.id === target.id))
    }
    if (dragging.kind === 'section' && target.kind === 'part') {
      const host = definition.find((part) => part.id === target.id)
      if (host) actions.moveSection(dragging.id, host.id, host.sections.length)
    }
    setDragging(null)
    setOver(null)
  }

  function dragProps(target: DragTarget) {
    return {
      draggable: true,
      onDragStart: (event: React.DragEvent) => {
        event.stopPropagation()
        setDragging(target)
      },
      onDragOver: (event: React.DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
        setOver(target.id)
      },
      onDrop: (event: React.DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
        drop(target)
      },
      onDragEnd: () => {
        setDragging(null)
        setOver(null)
      },
    }
  }

  return (
    <>
      <PaneBand kind={t('structure')} title={t('plan')} subtitle={t('variableCount', { count: variables })} />
      <p className="border-b border-gray-100 px-3 py-2 text-[11.5px] leading-snug text-text-muted">{t('planHint')}</p>

      <div className="flex-1 overflow-y-auto p-2">
        {definition.map((part, partIndex) => {
          const open = openParts[part.id] ?? false
          const holdsSelection = part.sections.some((section) => section.id === sectionId)
          const drift = part.sections.reduce((total, section) => total + sectionDrift(section, references), 0)
          const count = part.sections.reduce((total, section) => total + section.fields.length, 0)

          return (
            <div
              key={part.id}
              className={cn(
                'mb-2 overflow-hidden rounded-[11px] border border-border bg-white',
                open ? 'shadow-elevation-xs' : '',
              )}
            >
              <div
                {...dragProps({ kind: 'part', id: part.id })}
                data-selected={holdsSelection && !open}
                data-testid={`crf-part-${part.id}`}
                onClick={() => actions.togglePart(part.id)}
                className={cn(
                  'group flex cursor-pointer items-center gap-1.5 bg-gray-50 px-2 py-2.5 hover:bg-gray-100',
                  open ? 'border-b border-gray-100' : '',
                  holdsSelection && !open ? 'bg-coral-50 shadow-[inset_3px_0_0_var(--color-coral-600)] hover:bg-coral-50' : '',
                  over === part.id ? 'shadow-[inset_0_2px_0_var(--color-coral-600)]' : '',
                )}
              >
                <GripIcon />
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn('flex-none text-gray-300 transition-transform', open ? 'rotate-90' : '')}
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[13.5px] font-semibold', holdsSelection && !open ? 'text-coral-700' : 'text-text-primary')}>
                    {part.name}
                  </span>
                  <span className="block text-[10.5px] font-medium uppercase tracking-[0.03em] text-text-muted">
                    {t('partKind')} · {t('sectionCount', { count: part.sections.length })}
                  </span>
                </span>
                {drift > 0 && !open ? <OriginTag tone="tuned">{drift}</OriginTag> : null}
                <span className="flex-none text-[11px] tabular-nums text-text-muted group-hover:hidden group-data-[selected=true]:hidden">{count}</span>
                <MoveButtons
                  disabledUp={partIndex === 0}
                  disabledDown={partIndex === definition.length - 1}
                  onUp={() => actions.movePart(part.id, partIndex - 1)}
                  onDown={() => actions.movePart(part.id, partIndex + 1)}
                  labels={{ up: t('moveUp'), down: t('moveDown') }}
                />
              </div>

              {open ? (
                <div className="py-1.5 pl-3 pr-1.5">
                  {part.sections.map((section, sectionIndex) => {
                    const selected = section.id === sectionId
                    const drifted = sectionDrift(section, references)
                    return (
                      <div
                        key={section.id}
                        {...dragProps({ kind: 'section', id: section.id })}
                        data-selected={selected}
                        data-testid={`crf-section-${section.id}`}
                        onClick={() => actions.selectSection(section.id)}
                        className={cn(
                          'group flex cursor-pointer items-center gap-1.5 rounded-lg py-1.5 pl-2 pr-1.5 hover:bg-gray-50',
                          selected ? 'bg-coral-50 shadow-[inset_2px_0_0_var(--color-coral-600)] hover:bg-coral-50' : '',
                          over === section.id ? 'shadow-[inset_0_2px_0_var(--color-coral-600)]' : '',
                        )}
                      >
                        <GripIcon />
                        <span className={cn('min-w-0 flex-1 truncate text-[12.5px]', selected ? 'font-semibold text-text-primary' : 'text-gray-600')}>
                          {section.name}
                        </span>
                        {drifted > 0 ? <OriginTag tone="tuned">{drifted}</OriginTag> : null}
                        <span className="flex-none text-[11px] tabular-nums text-text-muted group-hover:hidden group-data-[selected=true]:hidden">
                          {section.fields.length}
                        </span>
                        <MoveButtons
                          disabledUp={sectionIndex === 0}
                          disabledDown={sectionIndex === part.sections.length - 1}
                          onUp={() => actions.moveSection(section.id, part.id, sectionIndex - 1)}
                          onDown={() => actions.moveSection(section.id, part.id, sectionIndex + 1)}
                          labels={{ up: t('moveUp'), down: t('moveDown') }}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-gray-100 p-2.5">
        <Button variant="outline" className="w-full gap-2" onClick={actions.addEmptyPart}>
          <Plus className="size-4" />
          {t('emptyPart')}
        </Button>
        <Button className="w-full gap-2 bg-coral-600 text-white hover:bg-coral-700" onClick={actions.openLibrary}>
          {t('importBlock')}
        </Button>
      </div>
    </>
  )
}
