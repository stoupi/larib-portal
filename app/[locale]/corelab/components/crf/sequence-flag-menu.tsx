'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { CorelabSequenceFlagCategory } from '@/app/generated/prisma'

const CATEGORIES = ['NOT_ANALYZABLE', 'ARTEFACTS_SEVERE', 'SOFTWARE_ERROR', 'OTHER'] as const

export type SequenceFlag = { category: CorelabSequenceFlagCategory; note: string }

type SequenceFlagMenuProps = {
  value: SequenceFlag | null
  onChange: (next: SequenceFlag | null) => void
  disabled: boolean
}

export function SequenceFlagMenu({ value, onChange, disabled }: SequenceFlagMenuProps) {
  const t = useTranslations('corelab.reading')
  const [note, setNote] = useState(value?.note ?? '')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={value ? 'text-amber-600' : 'text-text-secondary'}
        >
          <TriangleAlert className="mr-2 h-4 w-4" />
          {t('flagSequence')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="text-sm font-medium text-text-primary">{t('flagSequence')}</p>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              type="button"
              variant={value?.category === category ? 'default' : 'ghost'}
              size="sm"
              className="justify-start"
              onClick={() => onChange({ category, note: note.trim() })}
            >
              {t(`flagCategories.${category}`)}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sequence-flag-note">{t('flagNote')}</Label>
          <Input id="sequence-flag-note" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onChange(null)}>
          {t('clearSequenceFlag')}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
