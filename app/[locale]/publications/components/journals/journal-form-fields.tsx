'use client'

import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Link2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { lookupJournalIssnAction } from '../../actions'
import {
  JOURNAL_SPECIALTIES,
  subSpecialtiesFor,
  type JournalSpecialty,
  type JournalSubSpecialty,
} from '@/lib/publications/journal-taxonomy'
import { withSpecialty, type JournalDraft } from '@/lib/publications/journal-draft'

type SectionProps = {
  draft: JournalDraft
  onChange: (draft: JournalDraft) => void
}

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
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

export function JournalLookupSection({ draft, onChange }: SectionProps) {
  const t = useTranslations('publications.journals')

  const { execute: runLookup, isExecuting: lookingUp } = useAction(lookupJournalIssnAction, {
    onSuccess({ data }) {
      if (!data) {
        toast.error(t('lookupNotFound'))
        return
      }
      onChange({
        ...draft,
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

  return (
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
              onChange={(event) => onChange({ ...draft, issn: event.target.value })}
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
  )
}

export function JournalIdentitySection({ draft, onChange }: SectionProps) {
  const t = useTranslations('publications.journals')

  return (
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
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
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
              onChange={(event) => onChange({ ...draft, abbreviation: event.target.value })}
              placeholder="NEJM"
              className="h-12 rounded-2xl"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="journal-publisher" className="block text-sm font-semibold text-text-primary">
              {t('publisher')}
            </label>
            <Input
              id="journal-publisher"
              value={draft.publisher}
              onChange={(event) => onChange({ ...draft, publisher: event.target.value })}
              placeholder="Elsevier, Oxford University Press…"
              className="h-12 rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="journal-url" className="block text-sm font-semibold text-text-primary">
              {t('url')} <span className="font-normal text-text-muted">{t('urlHint')}</span>
            </label>
            <Input
              id="journal-url"
              value={draft.url}
              onChange={(event) => onChange({ ...draft, url: event.target.value })}
              placeholder="https://academic.oup.com/eurheartj"
              className="h-12 rounded-2xl"
            />
          </div>
        </div>

        <ChipGroup
          label={t('specialty')}
          options={JOURNAL_SPECIALTIES.map((specialty) => ({ value: specialty, label: t(`specialties.${specialty}`) }))}
          selected={draft.specialty}
          onSelect={(value) => onChange(withSpecialty(draft, value as JournalSpecialty))}
        />

        <ChipGroup
          label={t('subSpecialty')}
          options={subSpecialtiesFor(draft.specialty).map((subSpecialty) => ({
            value: subSpecialty,
            label: t(`subSpecialties.${subSpecialty}`),
          }))}
          selected={draft.subSpecialty}
          onSelect={(value) => onChange({ ...draft, subSpecialty: value as JournalSubSpecialty })}
        />

        <label className="flex cursor-pointer items-start gap-3.5 rounded-2xl border border-line p-4">
          <Checkbox
            checked={draft.openAccess}
            onCheckedChange={(checked) => onChange({ ...draft, openAccess: checked === true })}
            className="mt-0.5 size-5"
          />
          <span>
            <span className="block text-sm font-bold text-text-primary">{t('openAccess')}</span>
            <span className="block text-sm text-text-secondary">{t('openAccessHint')}</span>
          </span>
        </label>
      </div>
    </SectionCard>
  )
}

export function JournalMetricsSection({ draft, onChange }: SectionProps) {
  const t = useTranslations('publications.journals')

  return (
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
            onChange={(event) => onChange({ ...draft, impactFactor: event.target.value })}
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
            onChange={(event) => onChange({ ...draft, sjr: event.target.value })}
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
            onChange={(event) => onChange({ ...draft, typicalDelayDays: event.target.value })}
            placeholder="120"
            className="h-12 rounded-2xl"
          />
        </div>
      </div>
    </SectionCard>
  )
}
