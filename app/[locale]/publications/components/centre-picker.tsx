'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Activity, Building2, ChevronDown, Globe, Plus, Search, UserRoundCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { createCentreAction } from '@/app/[locale]/publications/actions'
import type { CentreIdentity } from '@/lib/services/publications/centres'

export type CentreOption = CentreIdentity

type PickerState = {
  centres: CentreOption[]
  selectedIds: string[]
  onChange: (nextIds: string[]) => void
  onCentreCreated: (centre: CentreOption) => void
  canCreate: boolean
}

export function centreInitials(centre: CentreOption): string {
  const short = centre.shortCode?.trim()
  if (short) return short.slice(0, 4).toUpperCase()
  const cleaned = centre.name.replace(/^(hôpital|hopital|centre|institut|university|université|department|dept|the)\s+/i, '').trim()
  return cleaned.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || '?'
}

function centreSubtitle(centre: CentreOption): string {
  return [centre.parentOrganisation, [centre.city, centre.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
}

function matchesQuery(centre: CentreOption, query: string): boolean {
  const haystack = [centre.name, centre.shortCode, centre.city, centre.country, centre.parentOrganisation].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(query.toLowerCase())
}

export function OurTeamToggle({ isOurTeam, onOurTeam, onExternal, ownCentreName }: { isOurTeam: boolean; onOurTeam: () => void; onExternal: () => void; ownCentreName?: string }) {
  const t = useTranslations('publications.authors.add')
  const base = 'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
  return (
    <div className="inline-flex w-fit gap-1 rounded-xl bg-gray-100 p-1 dark:bg-white/5">
      <button
        type="button"
        onClick={onOurTeam}
        disabled={!ownCentreName}
        title={ownCentreName ?? t('ourTeamHint')}
        className={`${base} ${isOurTeam ? 'bg-bg-surface text-coral-600 shadow-sm' : 'text-text-muted hover:text-coral-600'}`}
      >
        <UserRoundCheck className="h-4 w-4" />{t('ourTeam')}
      </button>
      <button
        type="button"
        onClick={onExternal}
        className={`${base} ${!isOurTeam ? 'bg-bg-surface text-coral-600 shadow-sm' : 'text-text-muted hover:text-coral-600'}`}
      >
        <Globe className="h-4 w-4" />{t('external')}
      </button>
    </div>
  )
}

function NewCentrePanel({ initialName, onCancel, onCreated }: { initialName: string; onCancel: () => void; onCreated: (centre: CentreOption) => void }) {
  const t = useTranslations('publications.authors.add')
  const tc = useTranslations('publications.centres')
  const [name, setName] = useState(initialName)
  const [shortCode, setShortCode] = useState('')
  const [parentOrganisation, setParentOrganisation] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [isOwn, setIsOwn] = useState(false)

  const create = useAction(createCentreAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      toast.success(data.reused ? t('centreReused') : tc('created'))
      onCreated(data.centre)
    },
    onError: () => toast.error(tc('error')),
  })

  function submit() {
    if (!name.trim()) return
    create.execute({
      name: name.trim(),
      shortCode: shortCode.trim() || null,
      parentOrganisation: parentOrganisation.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      isOwn,
    })
  }

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-bg-surface p-5">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 shrink-0 rounded-full bg-coral-500" />
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-coral-600">{t('newCentre')}</h3>
        <span className="h-px flex-1 bg-line" />
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>{t('backToSearch')}</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px]">
        <div className="space-y-1.5">
          <Label>{tc('cName')}</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Hôpital Lariboisière" />
        </div>
        <div className="space-y-1.5">
          <Label>{tc('cShortCode')}</Label>
          <Input value={shortCode} onChange={(event) => setShortCode(event.target.value)} placeholder="LRB" maxLength={8} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{tc('cParent')} <span className="font-normal text-text-muted">({tc('optional')})</span></Label>
        <Input value={parentOrganisation} onChange={(event) => setParentOrganisation(event.target.value)} placeholder="AP-HP, INSERM, Harvard Medical School…" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{tc('cCity')}</Label>
          <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Paris" />
        </div>
        <div className="space-y-1.5">
          <Label>{tc('cCountry')}</Label>
          <Input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="France" />
        </div>
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
        <Switch checked={isOwn} onCheckedChange={setIsOwn} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-text-primary">{tc('cOwn')}</span>
          <span className="block text-sm text-text-secondary">{tc('cOwnHint')}</span>
        </span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isOwn ? 'bg-gradient-to-b from-coral-500 to-coral-600 text-white' : 'bg-bg-muted text-text-muted'}`}>
          <Activity className="h-4 w-4" />
        </span>
      </label>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>{t('cancel')}</Button>
        <Button
          type="button"
          onClick={submit}
          disabled={create.isPending || !name.trim()}
          className="gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105"
        >
          <Building2 className="h-4 w-4" />{t('createAndSelect')}
        </Button>
      </div>
    </div>
  )
}

export function CentrePicker({ centres, selectedIds, onChange, onCentreCreated, canCreate }: PickerState) {
  const t = useTranslations('publications.authors.add')
  const [query, setQuery] = useState('')
  const [browsing, setBrowsing] = useState(false)
  const [creating, setCreating] = useState(false)
  const centreById = new Map(centres.map((centre) => [centre.id, centre]))
  const available = centres.filter((centre) => !selectedIds.includes(centre.id))
  const results = query.trim() ? available.filter((centre) => matchesQuery(centre, query.trim())) : available
  const listOpen = browsing || query.trim().length > 0

  function select(centreId: string) {
    onChange([...selectedIds, centreId])
    setQuery('')
    setBrowsing(false)
  }

  function handleCreated(centre: CentreOption) {
    onCentreCreated(centre)
    onChange([...selectedIds, centre.id])
    setCreating(false)
    setQuery('')
    setBrowsing(false)
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {selectedIds.map((centreId, index) => {
          const centre = centreById.get(centreId)
          if (!centre) return null
          const subtitle = centreSubtitle(centre)
          return (
            <li key={centreId} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${centre.isOwn ? 'border-coral-200 bg-coral-50' : 'border-line bg-gray-25 dark:bg-white/5'}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral-100 text-[11px] font-extrabold text-coral-600">{centreInitials(centre)}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-text-primary">{centre.name}</span>
                  {centre.isOwn && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-b from-coral-500 to-coral-600 text-white" title={t('ourTeam')}>
                      <Activity className="h-3 w-3" />
                    </span>
                  )}
                  {index === 0 && <span className="rounded-full bg-coral-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-coral-600">{t('primary')}</span>}
                </span>
                {subtitle && <span className="block truncate text-sm text-text-secondary">{subtitle}</span>}
              </span>
              <button type="button" aria-label={t('removeCentre')} onClick={() => onChange(selectedIds.filter((id) => id !== centreId))} className="text-text-muted hover:text-coral-600">
                <X className="h-4 w-4" />
              </button>
            </li>
          )
        })}
      </ul>

      {creating ? (
        <NewCentrePanel initialName={query.trim()} onCancel={() => setCreating(false)} onCreated={handleCreated} />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-bg-surface px-3 py-1.5">
            <Search className="h-4 w-4 shrink-0 text-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchCentre')}
              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-text-primary outline-none placeholder:text-text-placeholder"
            />
            <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={() => setBrowsing(!browsing)}>
              {t('browse')}<ChevronDown className={`h-4 w-4 transition ${browsing ? 'rotate-180' : ''}`} />
            </Button>
          </div>
          {listOpen && (
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-line bg-bg-surface p-1.5">
              {results.map((centre) => (
                <li key={centre.id}>
                  <button type="button" onClick={() => select(centre.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-coral-50">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-coral-50 text-[10px] font-bold text-coral-600">{centreInitials(centre)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-text-primary">{centre.name}</span>
                      <span className="block truncate text-xs text-text-secondary">{centreSubtitle(centre)}</span>
                    </span>
                    {centre.isOwn && <span className="rounded-full bg-coral-100 px-2 py-0.5 text-[10px] font-bold text-coral-600">{t('ours')}</span>}
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="px-3 py-2 text-sm text-text-muted">{t('noCentreFound')}</li>}
              {canCreate && (
                <li>
                  <button type="button" onClick={() => setCreating(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-coral-600 hover:bg-coral-50">
                    <Plus className="h-4 w-4" />
                    {query.trim() ? t('createNamedCentre', { name: query.trim() }) : t('createCentre')}
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
