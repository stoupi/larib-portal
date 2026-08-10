'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Download, Search, Building2, UserRound, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { previewClinicalTrialAction, importClinicalTrialAction } from '../actions'
import type { ClinicalTrialImport } from '@/lib/services/publications/clinicaltrials'
import { SingleSelect } from '@/components/ui/single-select'
import type { CentrePreview } from '@/lib/services/publications/centre-resolve'
import type { CentreOption } from './centre-picker'
import type { AuthorOption, InvestigatorPreview } from '@/lib/services/publications/investigator-resolve'

const CORAL = 'gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105'

type Props = { open: boolean; onClose: () => void }

export function ImportTrialDialog({ open, onClose }: Props) {
  const t = useTranslations('publications.studies.importTrial')
  const tStatus = useTranslations('publications.studies.status')
  const router = useRouter()
  const [nctId, setNctId] = useState('')
  const [preview, setPreview] = useState<ClinicalTrialImport | null>(null)
  const [centres, setCentres] = useState<CentrePreview[]>([])
  const [bank, setBank] = useState<CentreOption[]>([])
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [investigators, setInvestigators] = useState<InvestigatorPreview[]>([])
  const [authorBank, setAuthorBank] = useState<AuthorOption[]>([])
  const [personOverrides, setPersonOverrides] = useState<Record<string, string>>({})

  function errorMessage(reason: string): string {
    const known = new Set(['INVALID_NCT_ID', 'DUPLICATE', 'NOT_FOUND', 'FETCH_FAILED', 'IMPORT_FAILED'])
    return t(`errors.${known.has(reason) ? reason : 'FETCH_FAILED'}`)
  }

  const previewAction = useAction(previewClinicalTrialAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      if (data.ok) {
        setPreview(data.preview); setCentres(data.centres); setBank(data.bank); setOverrides({})
        setInvestigators(data.investigators); setAuthorBank(data.authorBank); setPersonOverrides({})
      } else {
        setPreview(null); setCentres([]); setBank([]); setOverrides({})
        setInvestigators([]); setAuthorBank([]); setPersonOverrides({})
        toast.error(errorMessage(data.error))
      }
    },
    onError: () => toast.error(errorMessage('FETCH_FAILED')),
  })

  const importAction = useAction(importClinicalTrialAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      if (data.ok) {
        toast.success(t('imported', { centres: data.result.centresCreated, people: data.result.investigatorsCreated }))
        handleClose()
        router.refresh()
      } else {
        toast.error(errorMessage(data.error))
      }
    },
    onError: () => toast.error(errorMessage('IMPORT_FAILED')),
  })

  function handleClose() {
    setNctId('')
    setPreview(null)
    setCentres([])
    setBank([])
    setOverrides({})
    setInvestigators([])
    setAuthorBank([])
    setPersonOverrides({})
    onClose()
  }

  const fetching = previewAction.isPending
  const importing = importAction.isPending

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose() }}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <p className="text-sm text-text-secondary">{t('description')}</p>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label>{t('nctLabel')}</Label>
              <Input
                value={nctId}
                onChange={(event) => setNctId(event.target.value)}
                placeholder="NCT06235385"
                onKeyDown={(event) => { if (event.key === 'Enter' && nctId.trim()) previewAction.execute({ nctId: nctId.trim() }) }}
              />
            </div>
            <Button type="button" variant="outline" className="gap-2" disabled={!nctId.trim() || fetching} onClick={() => previewAction.execute({ nctId: nctId.trim() })}>
              <Search className="h-4 w-4" />
              {fetching ? t('fetching') : t('fetch')}
            </Button>
          </div>

          {preview && (
            <div className="space-y-4 rounded-2xl border border-line bg-bg-surface p-4">
              <div>
                <div className="flex items-center gap-2">
                  <a href={`https://clinicaltrials.gov/study/${preview.nctId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-coral-600 hover:underline">
                    {preview.nctId}<ExternalLink className="h-3 w-3" />
                  </a>
                  <Badge variant="secondary">{tStatus(preview.status)}</Badge>
                </div>
                <p className="mt-1 font-extrabold text-text-primary">{preview.title}</p>
                {preview.acronym && <p className="text-sm text-text-secondary">{preview.acronym}</p>}
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Field label={t('fieldDates')} value={[preview.startDate, preview.endDate].filter(Boolean).join(' → ') || '—'} />
                <Field label={t('fieldFunding')} value={preview.funding ?? '—'} />
                <Field label={t('fieldDomain')} value={preview.domain ?? '—'} span />
              </dl>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ListBlock icon={<Building2 className="h-4 w-4" />} label={t('centres', { count: preview.centres.length })}>
                  {centres.map((centre) => (
                    <li key={centre.rawName} className="space-y-1 rounded-lg border border-line p-2">
                      <p className="truncate font-medium">{centre.rawName}</p>
                      <CentreResolution
                        centre={centre}
                        bank={bank}
                        chosenId={overrides[centre.rawName] ?? null}
                        onChoose={(centreId) => setOverrides({ ...overrides, [centre.rawName]: centreId })}
                        onReset={() => setOverrides(Object.fromEntries(Object.entries(overrides).filter(([rawName]) => rawName !== centre.rawName)))}
                      />
                    </li>
                  ))}
                </ListBlock>
                <ListBlock icon={<UserRound className="h-4 w-4" />} label={t('investigators', { count: preview.investigators.length })}>
                  {investigators.map((person) => (
                    <li key={person.key} className="space-y-1 rounded-lg border border-line p-2">
                      <p className="truncate font-medium">{person.fullName}{person.degrees ? `, ${person.degrees}` : ''}</p>
                      <InvestigatorResolution
                        person={person}
                        bank={authorBank}
                        chosenId={personOverrides[person.key] ?? null}
                        onChoose={(authorId) => setPersonOverrides({ ...personOverrides, [person.key]: authorId })}
                        onReset={() => setPersonOverrides(Object.fromEntries(Object.entries(personOverrides).filter(([key]) => key !== person.key)))}
                      />
                    </li>
                  ))}
                </ListBlock>
              </div>
              <p className="text-xs text-text-muted">{t('reviewHint')}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>{t('cancel')}</Button>
          <Button type="button" className={CORAL} disabled={!preview || importing} onClick={() => preview && importAction.execute({ nctId: preview.nctId, centreOverrides: Object.entries(overrides).map(([rawName, centreId]) => ({ rawName, centreId })), investigatorOverrides: Object.entries(personOverrides).map(([key, authorId]) => ({ key, authorId })) })}>
            <Download className="h-4 w-4" />
            {importing ? t('importing') : t('import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const CENTRE_STATUS_STYLE: Record<CentrePreview['status'] | 'chosen', string> = {
  existing: 'border-transparent bg-emerald-100 text-emerald-800',
  new: 'border-transparent bg-amber-100 text-amber-800',
  chosen: 'border-transparent bg-coral-100 text-coral-700',
}

// The automatic match is a proposal: an admin who knows the site can point it at the right
// centre in the bank, and the import then records the raw spelling as an alias.
function CentreResolution({ centre, bank, chosenId, onChoose, onReset }: { centre: CentrePreview; bank: CentreOption[]; chosenId: string | null; onChoose: (centreId: string) => void; onReset: () => void }) {
  const t = useTranslations('publications.studies.importTrial')
  const [picking, setPicking] = useState(false)
  const chosen = chosenId ? bank.find((option) => option.id === chosenId) ?? null : null

  if (picking) {
    return (
      <span className="flex items-center gap-1.5">
        <SingleSelect
          options={bank.map((option) => ({ value: option.id, label: option.name }))}
          value={chosenId ?? ''}
          onChange={(value) => { if (value) { onChoose(value); setPicking(false) } }}
          placeholder={t('pickCentre')}
          searchable
          searchPlaceholder={t('searchCentre')}
          emptyLabel={t('noCentreFound')}
          className="min-w-0 flex-1"
        />
        <Button type="button" variant="ghost" size="sm" onClick={() => setPicking(false)}>{t('cancel')}</Button>
      </span>
    )
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <Badge className={chosen ? CENTRE_STATUS_STYLE.chosen : CENTRE_STATUS_STYLE[centre.status]}>
          {chosen ? t('centreStatus.chosen') : t(`centreStatus.${centre.status}`)}
        </Badge>
        {chosen
          ? <span className="truncate text-text-secondary">{chosen.name}</span>
          : centre.resolvedName !== centre.rawName && <span className="truncate text-text-secondary">{centre.resolvedName}</span>}
      </span>
      {chosen && <button type="button" onClick={onReset} className="shrink-0 text-text-muted hover:text-coral-600">{t('resetCentre')}</button>}
      <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={() => setPicking(true)}>{t('changeCentre')}</Button>
    </span>
  )
}

// Same contract as the centres: the automatic match against the author bank is a proposal
// an admin can redirect onto the right person before the study is created.
function InvestigatorResolution({ person, bank, chosenId, onChoose, onReset }: { person: InvestigatorPreview; bank: AuthorOption[]; chosenId: string | null; onChoose: (authorId: string) => void; onReset: () => void }) {
  const t = useTranslations('publications.studies.importTrial')
  const [picking, setPicking] = useState(false)
  const chosen = chosenId ? bank.find((option) => option.id === chosenId) ?? null : null

  if (picking) {
    return (
      <span className="flex items-center gap-1.5">
        <SingleSelect
          options={bank.map((option) => ({ value: option.id, label: `${option.firstName} ${option.lastName}` }))}
          value={chosenId ?? ''}
          onChange={(value) => { if (value) { onChoose(value); setPicking(false) } }}
          placeholder={t('pickAuthor')}
          searchable
          searchPlaceholder={t('searchAuthor')}
          emptyLabel={t('noAuthorFound')}
          className="min-w-0 flex-1"
        />
        <Button type="button" variant="ghost" size="sm" onClick={() => setPicking(false)}>{t('cancel')}</Button>
      </span>
    )
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <Badge className={chosen ? CENTRE_STATUS_STYLE.chosen : CENTRE_STATUS_STYLE[person.status]}>
          {chosen ? t('centreStatus.chosen') : t(`investigatorStatus.${person.status}`)}
        </Badge>
        {chosen
          ? <span className="truncate text-text-secondary">{chosen.firstName} {chosen.lastName}</span>
          : person.matchedName && person.matchedName !== person.fullName && <span className="truncate text-text-secondary">{person.matchedName}</span>}
      </span>
      {chosen && <button type="button" onClick={onReset} className="shrink-0 text-text-muted hover:text-coral-600">{t('resetCentre')}</button>}
      <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={() => setPicking(true)}>{t('changeCentre')}</Button>
    </span>
  )
}

function Field({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="text-text-primary">{value}</dd>
    </div>
  )
}

function ListBlock({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-secondary">{icon}{label}</div>
      <ul className="max-h-52 space-y-1 overflow-y-auto text-sm text-text-primary">{children}</ul>
    </div>
  )
}
