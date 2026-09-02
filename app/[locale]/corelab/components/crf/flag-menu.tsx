'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { FieldValue } from '@/types/corelab'

const CATEGORIES = ['UNCERTAIN_VALUE', 'POOR_IMAGE_QUALITY', 'MEASUREMENT_DIFFICULT', 'OTHER'] as const

type FlagMenuProps = {
  flag: FieldValue['flag']
  flagNote: FieldValue['flagNote']
  onChange: (flag: FieldValue['flag'], flagNote: string | null) => void
  disabled: boolean
}

export function FlagMenu({ flag, flagNote, onChange, disabled }: FlagMenuProps) {
  const t = useTranslations('corelab.form')
  const [note, setNote] = useState(flagNote ?? '')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label={t('flag')}
          className={flag ? 'text-amber-600' : 'text-text-secondary'}
        >
          <Flag className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="text-sm font-medium text-text-primary">{t('flag')}</p>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              type="button"
              variant={flag === category ? 'default' : 'ghost'}
              size="sm"
              className="justify-start"
              onClick={() => onChange(category, note.trim() === '' ? null : note.trim())}
            >
              {t(`flags.${category}`)}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="flag-note">{t('flagNote')}</Label>
          <Input id="flag-note" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onChange(null, null)}>
          {t('clearFlag')}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
