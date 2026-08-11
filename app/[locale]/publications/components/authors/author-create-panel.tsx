'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Check, ChevronDown, UserRoundPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { optionSearchScore } from '@/lib/option-search'
import type { PickerAuthor } from '@/lib/publications/author-picker'
import { createAuthorAction } from '../../actions'
import { OurTeamDot } from './our-team-dot'

export const CORAL_BUTTON =
  'gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105'

export type PickerCentre = { id: string; name: string; city: string | null; isOwn: boolean }

function CentrePicker({
  centres,
  selectedCentreId,
  onSelect,
}: {
  centres: PickerCentre[]
  selectedCentreId: string
  onSelect: (centreId: string) => void
}) {
  const t = useTranslations('publications.editor')
  return (
    <Command filter={optionSearchScore} className="rounded-xl border border-line bg-bg-surface">
      <CommandInput placeholder={t('picker.centrePlaceholder')} />
      <CommandList className="max-h-40">
        <CommandEmpty>{t('picker.empty')}</CommandEmpty>
        {centres.map((centre) => (
          <CommandItem
            key={centre.id}
            value={`${centre.name} ${centre.city ?? ''}`}
            onSelect={() => onSelect(centre.id)}
            className="text-sm"
          >
            <Check
              className={cn('h-4 w-4 text-coral-600', selectedCentreId === centre.id ? 'opacity-100' : 'opacity-0')}
            />
            <span className="truncate">
              {centre.name}
              {centre.city && <span className="text-text-muted"> · {centre.city}</span>}
            </span>
            {centre.isOwn && <OurTeamDot className="ml-auto" />}
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  )
}

export function CreateAuthorPanel({
  centres,
  onCreated,
}: {
  centres: PickerCentre[]
  onCreated: (author: PickerAuthor) => void
}) {
  const t = useTranslations('publications.editor')
  const [expanded, setExpanded] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [centreId, setCentreId] = useState('')
  const [duplicateStatus, setDuplicateStatus] = useState<'none' | 'blocked' | 'warning'>('none')

  const selectedCentre = centres.find((centre) => centre.id === centreId) ?? null
  const complete = firstName.trim() !== '' && lastName.trim() !== '' && centreId !== ''

  const create = useAction(createAuthorAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      if (data.status === 'blocked') {
        setDuplicateStatus('blocked')
        return
      }
      if (data.status === 'warning') {
        setDuplicateStatus('warning')
        return
      }
      setDuplicateStatus('none')
      toast.success(t('picker.created'))
      onCreated({
        id: data.author.id,
        firstName: data.author.firstName,
        lastName: data.author.lastName,
        initials: null,
        degrees: null,
        isOurTeam: selectedCentre?.isOwn ?? false,
        centreName: selectedCentre?.name ?? null,
        publicationCount: 0,
      })
      setFirstName('')
      setLastName('')
      setCentreId('')
      setExpanded(false)
    },
    onError: () => toast.error(t('actionError')),
  })

  function submit(confirmDuplicate: boolean) {
    if (!complete) return
    create.execute({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      centreIds: [centreId],
      confirmDuplicate,
    })
  }

  return (
    <div className="rounded-2xl border border-line bg-bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-bold text-text-secondary transition hover:text-coral-600"
      >
        <UserRoundPlus className="h-4 w-4 text-coral-600" strokeWidth={2.2} />
        {t('picker.newAuthor')}
        <ChevronDown className={cn('ml-auto h-4 w-4 transition', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-line px-4 py-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('picker.firstName')}</Label>
              <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('picker.lastName')}</Label>
              <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </div>
          </div>

          <CentrePicker centres={centres} selectedCentreId={centreId} onSelect={setCentreId} />
          {!centreId && <p className="text-xs text-text-muted">{t('picker.centreRequired')}</p>}

          {duplicateStatus === 'blocked' && (
            <p className="rounded-lg border border-line bg-gray-50 px-3 py-2 text-xs font-semibold text-text-secondary dark:bg-white/5">
              {t('picker.duplicateBlocked')}
            </p>
          )}

          {duplicateStatus === 'warning' && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-coral-200 bg-coral-50 px-3 py-2 dark:border-coral-500/40 dark:bg-coral-500/10">
              <p className="flex-1 text-xs font-semibold text-coral-600 dark:text-coral-300">
                {t('picker.duplicateWarning')}
              </p>
              <Button type="button" size="sm" className={CORAL_BUTTON} disabled={create.isPending} onClick={() => submit(true)}>
                {t('picker.createAnyway')}
              </Button>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={!complete || create.isPending}
            onClick={() => submit(false)}
          >
            {t('picker.create')}
          </Button>
        </div>
      )}
    </div>
  )
}
