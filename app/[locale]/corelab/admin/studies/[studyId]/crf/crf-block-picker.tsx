'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, Plus } from 'lucide-react'
import { EditorInput, PaneBand } from './crf-chrome'
import type { SectionDefinition, SequenceDefinition } from '@/lib/corelab/crf/schema'

export type LibraryBlockOption = {
  id: string
  name: string
  definition: SectionDefinition | SequenceDefinition
}

export function CrfBlockPicker({ blocks, modality, sectionName, onInsert, onClose }: {
  blocks: LibraryBlockOption[]
  modality: string
  sectionName: string
  onInsert: (block: LibraryBlockOption) => void
  onClose: () => void
}) {
  const t = useTranslations('corelab.crfEditor')
  const [search, setSearch] = useState('')

  const needle = search.trim().toLowerCase()
  const shown = blocks.filter((block) => needle === '' || block.name.toLowerCase().includes(needle))

  function meta(block: LibraryBlockOption): string {
    if ('sections' in block.definition) {
      const variables = block.definition.sections.reduce((total, section) => total + section.fields.length, 0)
      return `${t('partKind')} · ${t('sectionCount', { count: block.definition.sections.length })} · ${t('variableCount', { count: variables })}`
    }
    return `Section · ${t('variableCount', { count: block.definition.fields.length })}`
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
        {shown.map((block) => (
          <button
            key={block.id}
            type="button"
            data-testid={`crf-block-${block.id}`}
            onClick={() => onInsert(block)}
            className="mb-1.5 flex w-full cursor-pointer items-center gap-2 rounded-[10px] border border-gray-100 bg-gray-25 p-2 text-left hover:border-coral-300 hover:bg-coral-50"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] text-gray-700">{block.name}</span>
              <span className="block truncate text-[11px] text-text-muted">{meta(block)}</span>
            </span>
            <span className="inline-flex size-6 flex-none items-center justify-center rounded-lg border border-line bg-white text-text-secondary">
              <Plus className="size-3.5" />
            </span>
          </button>
        ))}
      </div>
    </>
  )
}
