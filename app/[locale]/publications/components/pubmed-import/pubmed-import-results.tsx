'use client'

import { useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CandidateMatch, ImportCandidate } from '@/lib/publications/import-candidates'

const MATCH_BADGE_CLASS: Record<CandidateMatch, string> = {
  new: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
  known: 'border-line bg-gray-100 text-text-secondary dark:bg-white/10',
  similar: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300',
}

export function PubmedImportResults({
  candidates,
  onSelect,
  pendingPmid,
}: {
  candidates: ImportCandidate[]
  onSelect: (pmid: string) => void
  pendingPmid: string | null
}) {
  const t = useTranslations('publications.pubmedImport')
  const tImport = useTranslations('publications.import')

  return (
    <ul className="space-y-2">
      {candidates.map((candidate) => (
        <li key={candidate.pmid}>
          <button
            type="button"
            onClick={() => onSelect(candidate.pmid)}
            disabled={pendingPmid !== null}
            className={cn(
              'flex w-full items-start gap-3 rounded-xl border border-line bg-bg-surface p-3 text-left transition hover:border-coral-300 hover:bg-coral-50/40 disabled:opacity-60 dark:hover:bg-white/5',
              candidate.match !== 'new' && 'bg-gray-50/70 dark:bg-white/[0.03]',
              pendingPmid === candidate.pmid && 'border-coral-300',
            )}
          >
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-bold leading-snug text-text-primary">{candidate.title}</p>
              <p className="text-xs text-text-muted">
                {[candidate.journal, candidate.year, `PMID ${candidate.pmid}`].filter(Boolean).join(' · ')}
              </p>
              <span
                className={cn(
                  'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold',
                  MATCH_BADGE_CLASS[candidate.match],
                )}
                title={candidate.matchedTitle ?? undefined}
              >
                {tImport(`match.${candidate.match}`)}
              </span>
            </div>
            <span className="mt-1 shrink-0 text-text-muted">
              {pendingPmid === candidate.pmid ? (
                <span className="text-xs font-semibold">{t('loadingPreview')}</span>
              ) : (
                <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
