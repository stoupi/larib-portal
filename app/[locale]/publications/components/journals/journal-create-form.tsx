'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { BookOpen, Link2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from '@/app/i18n/navigation'
import { addJournalAction, lookupJournalIssnAction } from '../../actions'
import {
  JOURNAL_SPECIALTIES,
  keepSubSpecialty,
  subSpecialtiesFor,
  type JournalSpecialty,
  type JournalSubSpecialty,
} from '@/lib/publications/journal-taxonomy'
import { JournalPreviewCard } from './journal-preview-card'

export type JournalDraft = {
  issn: string
  name: string
  abbreviation: string
  publisher: string
  specialty: JournalSpecialty | null
  subSpecialty: JournalSubSpecialty | null
  openAccess: boolean
  impactFactor: string
  sjr: string
  typicalDelayDays: string
}

const EMPTY_DRAFT: JournalDraft = {
  issn: '',
  name: '',
  abbreviation: '',
  publisher: '',
  specialty: 'CARDIOLOGY',
  subSpecialty: 'GENERAL',
  openAccess: false,
  impactFactor: '',
  sjr: '',
  typicalDelayDays: '',
}

function toNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-bg-surface p-6 shadow-elevation-xs">
      <div className="mb-5 flex items-center gap-2.5">
        <span aria-hidden className="size-2 rounded-full bg-coral-500" />
        <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-coral-600">{title}</h2>
        <span aria-hidden className="h-px flex-1 bg-line" />
      </div>
      {children}
    </section>
  )
}

function ChipGroup({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string | null
  onSelect: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-text-primary">{label}</span>
      <div className="flex flex-wrap gap-2.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected === option.value}
            onClick={() => onSelect(option.value)}
            className={cn(
              'rounded-xl border px-4 py-2.5 text-sm font-bold transition',
              selected === option.value
                ? 'border-coral-200 bg-coral-50 text-coral-600 dark:border-coral-500/40 dark:bg-coral-500/15 dark:text-coral-300'
                : 'border-line bg-bg-surface text-text-secondary hover:border-coral-200 hover:text-coral-600',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function JournalCreateForm() {
  const t = useTranslations('publications.journals')
  const tActions = useTranslations('publications')
  const router = useRouter()
  const [draft, setDraft] = useState<JournalDraft>(EMPTY_DRAFT)

  function update(patch: Partial<JournalDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  const { execute: runLookup, isExecuting: lookingUp } = useAction(lookupJournalIssnAction, {
    onSuccess({ data }) {
      if (!data) {
        toast.error(t('lookupNotFound'))
        return
      }
      update({
        name: data.title,
        publisher: data.publisher ?? '',
        issn: data.issn,
        sjr: data.sjr != null ? String(data.sjr) : '',
      })
      toast.success(t('lookupDone'))
    },
    onError() {
      toast.error(t('lookupError'))
    },
  })

  const { executeAsync: execAdd, isExecuting: saving } = useAction(addJournalAction, {
    onError({ error }) {
      toast.error(error?.serverError === 'JOURNAL_EXISTS' ? t('errorExists') : tActions('actionError'))
    },
  })

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const result = await execAdd({
      name: draft.name.trim(),
      abbreviation: draft.abbreviation.trim() || null,
      issn: draft.issn.trim() || null,
      publisher: draft.publisher.trim() || null,
      impactFactor: toNumber(draft.impactFactor),
      sjr: toNumber(draft.sjr),
      specialty: draft.specialty,
      subSpecialty: draft.subSpecialty,
      openAccess: draft.openAccess,
      typicalDelayDays: toNumber(draft.typicalDelayDays),
    })
    if (!result?.data) return
    toast.success(t('created'))
    router.push('/publications/admin/journals')
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <SectionCard title={t('lookupSection')}>
        <div className="space-y-2">
          <label htmlFor="journal-issn" className="block text-sm font-semibold text-text-primary">
            {t('issn')} <span className="font-normal text-text-muted">{t('issnHint')}</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <Input
                id="journal-issn"
                value={draft.issn}
                onChange={(event) => update({ issn: event.target.value })}
                placeholder="0028-4793"
                className="h-12 rounded-2xl pl-9"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={lookingUp || draft.issn.trim().length < 4}
              onClick={() => runLookup({ issn: draft.issn })}
              className="h-12 gap-2 rounded-2xl px-6"
            >
              <Search className="size-4" />
              {lookingUp ? t('lookingUp') : t('lookup')}
            </Button>
          </div>
        </div>
      </SectionCard>

      <JournalPreviewCard draft={draft} />

      <SectionCard title={t('journalSection')}>
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <label htmlFor="journal-name" className="block text-sm font-semibold text-text-primary">
                {t('nameLabel')}
              </label>
              <Input
                id="journal-name"
                required
                value={draft.name}
                onChange={(event) => update({ name: event.target.value })}
                placeholder="New England Journal of Medicine"
                className="h-12 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="journal-abbreviation" className="block text-sm font-semibold text-text-primary">
                {t('shortCode')}
              </label>
              <Input
                id="journal-abbreviation"
                value={draft.abbreviation}
                onChange={(event) => update({ abbreviation: event.target.value })}
                placeholder="NEJM"
                className="h-12 rounded-2xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="journal-publisher" className="block text-sm font-semibold text-text-primary">
              {t('publisher')}
            </label>
            <Input
              id="journal-publisher"
              value={draft.publisher}
              onChange={(event) => update({ publisher: event.target.value })}
              placeholder="Elsevier, Oxford University Press…"
              className="h-12 rounded-2xl"
            />
          </div>

          <ChipGroup
            label={t('specialty')}
            options={JOURNAL_SPECIALTIES.map((specialty) => ({ value: specialty, label: t(`specialties.${specialty}`) }))}
            selected={draft.specialty}
            onSelect={(value) => {
              const specialty = value as JournalSpecialty
              update({ specialty, subSpecialty: keepSubSpecialty(specialty, draft.subSpecialty) ?? 'GENERAL' })
            }}
          />

          <ChipGroup
            label={t('subSpecialty')}
            options={subSpecialtiesFor(draft.specialty).map((subSpecialty) => ({
              value: subSpecialty,
              label: t(`subSpecialties.${subSpecialty}`),
            }))}
            selected={draft.subSpecialty}
            onSelect={(value) => update({ subSpecialty: value as JournalSubSpecialty })}
          />

          <label className="flex cursor-pointer items-start gap-3.5 rounded-2xl border border-line p-4">
            <Checkbox
              checked={draft.openAccess}
              onCheckedChange={(checked) => update({ openAccess: checked === true })}
              className="mt-0.5 size-5"
            />
            <span>
              <span className="block text-sm font-bold text-text-primary">{t('openAccess')}</span>
              <span className="block text-sm text-text-secondary">{t('openAccessHint')}</span>
            </span>
          </label>
        </div>
      </SectionCard>

      <SectionCard title={t('metricsSection')}>
        <p className="-mt-2 mb-5 text-sm text-text-secondary">{t('metricsHint')}</p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="journal-if" className="block text-sm font-semibold text-text-primary">
              {t('impactFactorLabel')}
            </label>
            <Input
              id="journal-if"
              type="number"
              step="0.001"
              min="0"
              value={draft.impactFactor}
              onChange={(event) => update({ impactFactor: event.target.value })}
              placeholder="24.0"
              className="h-12 rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="journal-sjr" className="block text-sm font-semibold text-text-primary">
              {t('sjr')}
            </label>
            <Input
              id="journal-sjr"
              type="number"
              step="0.001"
              min="0"
              value={draft.sjr}
              onChange={(event) => update({ sjr: event.target.value })}
              placeholder="6.5"
              className="h-12 rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="journal-delay" className="block text-sm font-semibold text-text-primary">
              {t('typicalDelay')} <span className="font-normal text-text-muted">{t('days')}</span>
            </label>
            <Input
              id="journal-delay"
              type="number"
              min="0"
              value={draft.typicalDelayDays}
              onChange={(event) => update({ typicalDelayDays: event.target.value })}
              placeholder="120"
              className="h-12 rounded-2xl"
            />
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/publications/admin/journals')}>
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          disabled={saving || draft.name.trim().length === 0}
          className="gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105"
        >
          <BookOpen className="size-4" />
          {t('addJournal')}
        </Button>
      </div>
    </form>
  )
}
