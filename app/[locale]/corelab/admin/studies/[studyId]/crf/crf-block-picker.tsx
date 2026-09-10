'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { groupBlocks } from '@/lib/corelab/library/blocks'
import { EditorInput, PaneBand } from '@/app/[locale]/corelab/components/crf/pane-chrome'
import type { SectionDefinition, SequenceDefinition } from '@/lib/corelab/crf/schema'

export type LibraryBlockOption = {
  id: string
  code: string
  name: string
  kind: 'SECTION' | 'SEQUENCE'
  definition: SectionDefinition | SequenceDefinition
}

// A section shown under its part drops the part's own name from its label, as the library does.
function shortName(name: string): string {
  return name.split('—').pop()?.trim() ?? name
}

export function CrfBlockPicker({ blocks, modality, sectionName, onInsert, onClose }: {
  blocks: LibraryBlockOption[]
  modality: string
  sectionName: string
  onInsert: (block: LibraryBlockOption, host: LibraryBlockOption | null) => void
  onClose: () => void
}) {
  const t = useTranslations('corelab.crfEditor')
  const words = useTranslations('corelab.crf')
  const [search, setSearch] = useState('')
  const groups = useMemo(() => groupBlocks(blocks), [blocks])

  const needle = search.trim().toLowerCase()
  const matches = (block: LibraryBlockOption) => needle === '' || block.name.toLowerCase().includes(needle)

  function meta(block: LibraryBlockOption): string {
    if ('sections' in block.definition) {
      const variables = block.definition.sections.reduce((total, section) => total + section.fields.length, 0)
      return `${words('sectionCount', { count: block.definition.sections.length })} · ${words('variableCount', { count: variables })}`
    }
    return words('variableCount', { count: block.definition.fields.length })
  }

  function BlockRow({ block, host, label, kind, className }: {
    block: LibraryBlockOption
    host: LibraryBlockOption | null
    label: string
    kind: string
    className: string
  }) {
    return (
      <button
        type="button"
        aria-label={t('importThis', { name: block.name })}
        data-testid={`crf-block-${block.code}`}
        onClick={() => onInsert(block, host)}
        className={cn('group flex w-full cursor-pointer items-center gap-2 text-left', className)}
      >
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate group-hover:text-coral-700',
              block.kind === 'SEQUENCE' ? 'text-[13.5px] font-semibold text-text-primary' : 'text-[12.5px] text-gray-600',
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              'block truncate text-text-muted',
              block.kind === 'SEQUENCE' ? 'text-[10.5px] font-medium uppercase tracking-[0.03em]' : 'text-[11px]',
            )}
          >
            {kind}
          </span>
        </span>
        <span
          aria-hidden
          className="inline-flex size-6 flex-none items-center justify-center rounded-lg border border-line bg-white text-coral-600 group-hover:border-coral-300 group-hover:bg-coral-50"
        >
          <Plus className="size-3.5" />
        </span>
      </button>
    )
  }

  return (
    <>
      <PaneBand
        kind={t('importBlock')}
        title={t('libraryPanel', { modality })}
        subtitle={sectionName}
        action={
          <button
            type="button"
            aria-label={t('backToPlan')}
            onClick={onClose}
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-[9px] bg-white/20 text-white hover:bg-white/30"
          >
            <ChevronLeft className="size-4" />
          </button>
        }
      />
      <div className="px-2.5 pt-2.5">
        <EditorInput value={search} onChange={setSearch} options={{ placeholder: t('searchBlock'), label: t('searchBlock') }} />
        <p className="py-2 text-[11.5px] leading-snug text-text-muted">{t('copyWarning')}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {groups.map((group) => {
          const part = group.sequence as LibraryBlockOption | null
          const sections = (group.sections as LibraryBlockOption[]).filter(matches)
          if (!sections.length && !(part && matches(part))) return null
          return (
            <div key={part?.code ?? 'loose'} className="mb-2 overflow-hidden rounded-[11px] border border-border bg-white">
              {part ? (
                <BlockRow
                  block={part}
                  host={null}
                  label={part.name}
                  kind={`${words('partKind')} · ${meta(part)}`}
                  className="bg-gray-50 px-2 py-2 hover:bg-gray-100"
                />
              ) : (
                <div className="bg-gray-50 px-2 py-2">
                  <span className="block truncate text-[13.5px] font-semibold text-text-primary">{words('looseSections')}</span>
                  <span className="block text-[10.5px] font-medium uppercase tracking-[0.03em] text-text-muted">
                    {words('sectionCount', { count: group.sections.length })}
                  </span>
                </div>
              )}
              <div className="py-1.5 pl-3 pr-1.5">
                {sections.map((section) => (
                  <BlockRow
                    key={section.code}
                    block={section}
                    host={part}
                    label={shortName(section.name)}
                    kind={meta(section)}
                    className="rounded-lg py-1.5 pl-2 pr-1.5 hover:bg-gray-50"
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
