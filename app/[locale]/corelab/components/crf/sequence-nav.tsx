'use client'

import { useTranslations } from 'next-intl'
import { sequenceCompletion } from '@/lib/corelab/crf/values'
import type { SequenceDefinition } from '@/lib/corelab/crf/schema'
import type { ExamValues } from '@/types/corelab'

type SequenceNavProps = {
  sequences: SequenceDefinition[]
  values: ExamValues
  activeId: string
  onSelect: (sequenceId: string) => void
}

export function SequenceNav({ sequences, values, activeId, onSelect }: SequenceNavProps) {
  const t = useTranslations('corelab.form')

  return (
    <nav className="space-y-1">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">{t('sequences')}</p>
      {sequences.map((sequence) => {
        const completion = sequenceCompletion(sequence, values[sequence.id] ?? {})
        const done = completion.required > 0 && completion.filled === completion.required
        return (
          <button
            key={sequence.id}
            type="button"
            onClick={() => onSelect(sequence.id)}
            className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${
              sequence.id === activeId ? 'bg-navy-700 text-white' : 'text-text-primary hover:bg-neutral-100'
            }`}
          >
            <span>{sequence.name}</span>
            <span className={done ? 'text-emerald-500' : sequence.id === activeId ? 'text-white' : 'text-text-secondary'}>
              {completion.filled}/{completion.required}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
