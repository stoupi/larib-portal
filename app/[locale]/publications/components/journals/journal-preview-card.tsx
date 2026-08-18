'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { JournalDraft } from '@/lib/publications/journal-draft'

function initials(name: string): string {
  const words = name.split(/[\s–-]+/).filter((word) => /[A-Za-zÀ-ÿ]/.test(word) && word.length > 2)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase()
  return words
    .slice(0, 4)
    .map((word) => word[0].toUpperCase())
    .join('')
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-gray-50 px-3 py-1.5 text-sm font-bold text-text-secondary tabular-nums dark:bg-white/10">
      {label} {value}
    </span>
  )
}

export function JournalPreviewCard({ draft }: { draft: JournalDraft }) {
  const t = useTranslations('publications.journals')
  const hasName = draft.name.trim().length > 0

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-bg-surface p-6 shadow-elevation-xs">
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={cn(
            'flex size-14 shrink-0 items-center justify-center rounded-2xl border text-xs font-extrabold',
            hasName
              ? 'border-coral-200 bg-coral-50 text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300'
              : 'border-line bg-gray-100 text-text-muted dark:bg-white/10',
          )}
        >
          {hasName ? initials(draft.abbreviation.trim() || draft.name) : '?'}
        </span>
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-lg font-extrabold text-text-primary">
            {hasName ? draft.name : t('previewNewJournal')}
          </p>
          <div className="flex flex-wrap gap-2">
            {draft.specialty && (
              <span className="rounded-full border border-coral-200 bg-coral-50 px-2.5 py-0.5 text-xs font-bold text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300">
                {t(`specialties.${draft.specialty}`)}
              </span>
            )}
            {draft.subSpecialty && (
              <span className="rounded-full border border-line bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-text-secondary dark:bg-white/10">
                {t(`subSpecialties.${draft.subSpecialty}`)}
              </span>
            )}
            {draft.openAccess && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                {t('openAccessBadge')}
              </span>
            )}
          </div>
          <p className="truncate text-sm text-text-muted">
            {draft.publisher.trim() || t('previewMissingPublisher')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <MetricPill label={t('colImpactFactor')} value={draft.impactFactor.trim() || '—'} />
        <MetricPill label={t('sjr')} value={draft.sjr.trim() || '—'} />
      </div>
    </section>
  )
}
