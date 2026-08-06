'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { searchBacklogAction, importBacklogAction, backfillAffiliationsAction } from '../actions'
import type { ImportReport } from '@/types/publications'
import { newCandidatePmids, type CandidateMatch, type ImportCandidate } from '@/lib/publications/import-candidates'
import type { LibraryDuplicates } from '@/lib/services/publications/duplicates'
import { ARTICLE_SCOPES, type ArticleScopeValue } from '@/lib/publications/article-scope'

const MATCH_BADGE_CLASS: Record<CandidateMatch, string> = {
  new: 'inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
  known: 'inline-flex rounded-full border border-line bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-text-secondary dark:bg-white/10',
  similar: 'inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300',
}

const CORAL_BUTTON_CLASS =
  'bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105'

export function BacklogImport() {
  const t = useTranslations('publications')
  const tArticles = useTranslations('publications.articles')
  const [query, setQuery] = useState('Pezel T')
  const [candidates, setCandidates] = useState<ImportCandidate[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [scopes, setScopes] = useState<Record<string, ArticleScopeValue>>({})
  const [report, setReport] = useState<ImportReport | null>(null)
  const [duplicates, setDuplicates] = useState<LibraryDuplicates | null>(null)

  const { execute: runSearch, isExecuting: searching } = useAction(searchBacklogAction, {
    onSuccess({ data }) {
      const found = data ?? []
      setCandidates(found)
      setSelected(new Set(newCandidatePmids(found)))
      setScopes({})
      setReport(null)
      setDuplicates(null)
    },
    onError() {
      toast.error(t('import.searchError'))
    },
  })

  const { execute: runImport, isExecuting: importing } = useAction(importBacklogAction, {
    onSuccess({ data }) {
      if (!data) return
      setReport(data.report)
      setDuplicates(data.duplicates)
      toast.success(
        t('import.reportBody', {
          created: data.report.articlesCreated,
          skipped: data.report.articlesSkipped,
          authors: data.report.authorsCreated,
          journals: data.report.journalsCreated,
        }),
      )
    },
    onError() {
      toast.error(t('import.importError'))
    },
  })

  const { execute: runBackfill, isExecuting: backfilling } = useAction(backfillAffiliationsAction, {
    onSuccess({ data }) {
      if (!data) return
      toast.success(t('centres.backfillDone', { articles: data.articlesTouched, affiliations: data.affiliationsCreated, centres: data.centresCreated }))
    },
    onError() {
      toast.error(t('import.importError'))
    },
  })

  function toggle(pmid: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(pmid)) next.delete(pmid)
      else next.add(pmid)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === candidates.length ? new Set() : new Set(candidates.map((paper) => paper.pmid))))
  }

  const knownCount = candidates.filter((paper) => paper.match === 'known').length
  const similarCount = candidates.filter((paper) => paper.match === 'similar').length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[280px] flex-1 space-y-1">
          <label htmlFor="pubmed-query" className="text-sm text-text-secondary">
            {t('import.query')}
          </label>
          <Input
            id="pubmed-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && query.trim().length > 0) runSearch({ query })
            }}
            placeholder={t('import.queryHint')}
          />
        </div>
        <Button onClick={() => runSearch({ query })} disabled={searching || query.trim().length === 0} className={CORAL_BUTTON_CLASS}>
          {searching ? t('import.searching') : t('import.search')}
        </Button>
        <Button variant="outline" onClick={() => runBackfill({ anchor: query })} disabled={backfilling || query.trim().length === 0}>
          {backfilling ? t('centres.backfilling') : t('centres.backfill')}
        </Button>
      </div>

      {candidates.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">
              {t('import.found', { count: candidates.length })}
              {knownCount > 0 && ` · ${t('import.alreadyKnown', { count: knownCount })}`}
              {similarCount > 0 && ` · ${t('import.lookalikeCount', { count: similarCount })}`}
            </span>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {t('import.selectAll')}
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">{t('import.colSelect')}</TableHead>
                <TableHead>{t('import.colTitle')}</TableHead>
                <TableHead>{t('import.colJournal')}</TableHead>
                <TableHead>{t('import.colScope')}</TableHead>
                <TableHead>{t('import.colStatus')}</TableHead>
                <TableHead>{t('import.colYear')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((paper) => (
                <TableRow key={paper.pmid} className={paper.match === 'new' ? undefined : 'bg-gray-50/70 dark:bg-white/[0.03]'}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(paper.pmid)}
                      onCheckedChange={() => toggle(paper.pmid)}
                      aria-label={paper.title}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {paper.title}
                    <span className="mt-0.5 block text-xs font-normal text-text-muted">PMID {paper.pmid}</span>
                  </TableCell>
                  <TableCell>{paper.journal || '—'}</TableCell>
                  <TableCell>
                    <select
                      value={scopes[paper.pmid] ?? 'OUTSIDE_TEAM'}
                      aria-label={`${tArticles('scopeLabel')}: ${paper.title}`}
                      onChange={(event) =>
                        setScopes((current) => ({ ...current, [paper.pmid]: event.target.value as ArticleScopeValue }))
                      }
                      className="w-full truncate rounded-md border border-line bg-bg-surface px-2 py-1 text-[11.5px] font-bold text-text-secondary"
                    >
                      {ARTICLE_SCOPES.map((value) => (
                        <option key={value} value={value}>
                          {tArticles(`scope.${value}`)}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <span className={MATCH_BADGE_CLASS[paper.match]} title={paper.matchedTitle ?? undefined}>
                      {t(`import.match.${paper.match}`)}
                    </span>
                    {paper.matchedTitle && (
                      <span className="mt-0.5 block max-w-[220px] truncate text-xs text-text-muted" title={paper.matchedTitle}>
                        {paper.matchedTitle}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{paper.year ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button
            onClick={() =>
              runImport({ papers: Array.from(selected).map((pmid) => ({ pmid, scope: scopes[pmid] ?? 'OUTSIDE_TEAM' })) })
            }
            disabled={importing || selected.size === 0}
            className={CORAL_BUTTON_CLASS}
          >
            {importing ? t('import.importing') : t('import.importSelected', { count: selected.size })}
          </Button>
        </>
      )}

      {report && (
        <div className="rounded-lg border border-line bg-bg-surface p-4">
          <p className="font-semibold text-text-primary">{t('import.reportTitle')}</p>
          <p className="text-text-secondary">
            {t('import.reportBody', {
              created: report.articlesCreated,
              skipped: report.articlesSkipped,
              authors: report.authorsCreated,
              journals: report.journalsCreated,
            })}
          </p>
          {report.errors.length > 0 && <p className="text-danger-600">{t('import.reportErrors', { count: report.errors.length })}</p>}
          {duplicates && (duplicates.authors.count > 0 || duplicates.journals.count > 0) && (
            <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{t('import.duplicatesTitle')}</p>
              {duplicates.authors.count > 0 && (
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {t('import.duplicateAuthors', {
                    count: duplicates.authors.count,
                    names: duplicates.authors.samples.join(', '),
                  })}{' '}
                  <Link href="/publications/admin/authors" className="font-bold underline">
                    {t('import.reviewAuthors')}
                  </Link>
                </p>
              )}
              {duplicates.journals.count > 0 && (
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {t('import.duplicateJournals', {
                    count: duplicates.journals.count,
                    names: duplicates.journals.samples.join(', '),
                  })}{' '}
                  <Link href="/publications/admin/journals" className="font-bold underline">
                    {t('import.reviewJournals')}
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
