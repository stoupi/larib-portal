'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { FileSearch, Search } from 'lucide-react'
import { useRouter } from '@/app/i18n/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { publicationsPaths, type PublicationsBasePath } from '@/lib/publications/base-path'
import { draftFieldsReplacedByImport, type DraftSummary } from '@/lib/publications/pubmed-import'
import type { ImportCandidate } from '@/lib/publications/import-candidates'
import type { PubmedRecordPreview } from '@/lib/services/publications/pubmed-search'
import {
  searchPubmedCandidatesAction,
  suggestPubmedQueryAction,
  fetchPubmedRecordPreviewAction,
  createArticleFromPubmedAction,
  importPubmedIntoArticleAction,
} from '../../actions'
import { PubmedImportResults } from './pubmed-import-results'
import { PubmedImportPreview } from './pubmed-import-preview'

export type PubmedImportTarget = { mode: 'create' } | { mode: 'fill'; articleId: string; draft: DraftSummary }

export function PubmedImportDialog({
  target,
  basePath,
  canImportAnyone,
  compact = false,
}: {
  target: PubmedImportTarget
  basePath: PublicationsBasePath
  canImportAnyone: boolean
  compact?: boolean
}) {
  const t = useTranslations('publications.pubmedImport')
  const router = useRouter()
  const paths = publicationsPaths(basePath)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null)
  const [preview, setPreview] = useState<PubmedRecordPreview | null>(null)
  const [pendingPmid, setPendingPmid] = useState<string | null>(null)

  const suggestQuery = useAction(suggestPubmedQueryAction, {
    onSuccess({ data }) {
      if (data?.query) setQuery((current) => (current.length === 0 ? data.query : current))
    },
  })

  const search = useAction(searchPubmedCandidatesAction, {
    onSuccess({ data }) {
      setCandidates(data ?? [])
      setPreview(null)
    },
    onError() {
      toast.error(t('searchError'))
    },
  })

  const loadPreview = useAction(fetchPubmedRecordPreviewAction, {
    onSuccess({ data }) {
      setPendingPmid(null)
      if (!data) {
        toast.error(t('previewError'))
        return
      }
      setPreview(data)
    },
    onError() {
      setPendingPmid(null)
      toast.error(t('previewError'))
    },
  })

  function onImported(articleId: string, authorCount: number) {
    setOpen(false)
    toast.success(t('importedToast', { count: authorCount }))
    // The record rewrites the whole article, including the fields the edit form already
    // holds in memory, so the editor is reloaded rather than merely refreshed.
    if (target.mode === 'fill') window.location.reload()
    else router.push(paths.articleEdit(articleId))
  }

  function onImportError(serverError: string | undefined) {
    toast.error(serverError?.includes('NOT_AN_AUTHOR') ? t('notAuthorError') : t('importError'))
  }

  const createArticle = useAction(createArticleFromPubmedAction, {
    onSuccess({ data }) {
      if (!data) return
      if (data.alreadyPresent) {
        setOpen(false)
        router.push(paths.article(data.articleId))
        return
      }
      onImported(data.articleId, preview?.authors.length ?? 0)
    },
    onError({ error }) {
      onImportError(error.serverError)
    },
  })

  const fillArticle = useAction(importPubmedIntoArticleAction, {
    onSuccess({ data }) {
      if (!data) return
      if (data.alreadyPresent) {
        setOpen(false)
        router.push(paths.article(data.articleId))
        return
      }
      onImported(data.articleId, preview?.authors.length ?? 0)
    },
    onError({ error }) {
      onImportError(error.serverError)
    },
  })

  function openDialog(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen && query.length === 0) suggestQuery.execute({})
    if (!nextOpen) {
      setPreview(null)
      setPendingPmid(null)
    }
  }

  function selectCandidate(pmid: string) {
    setPendingPmid(pmid)
    loadPreview.execute({ pmid })
  }

  function confirmImport() {
    if (!preview) return
    if (target.mode === 'fill')
      fillArticle.execute({ articleId: target.articleId, pmid: preview.pmid, asAdmin: canImportAnyone })
    else createArticle.execute({ pmid: preview.pmid, asAdmin: canImportAnyone })
  }

  const replacedFields =
    target.mode === 'fill' && preview ? draftFieldsReplacedByImport(target.draft, preview) : []
  const isImporting = createArticle.isExecuting || fillArticle.isExecuting
  // The draft being filled is not a duplicate of itself: only another article is a conflict.
  const currentArticleId = target.mode === 'fill' ? target.articleId : null
  const conflictingArticleId =
    preview && preview.existingArticleId !== currentArticleId ? preview.existingArticleId : null

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 items-center gap-2 rounded-xl border border-line bg-bg-surface font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5',
            compact ? 'h-8 px-3 text-[12px]' : 'h-11 px-5 text-sm',
          )}
        >
          <FileSearch className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2.2} />
          {t('trigger')}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {preview ? (
          <PubmedImportPreview
            preview={preview}
            decision={{
              blockedAsNonAuthor: !canImportAnyone && !preview.viewerIsAuthor,
              conflictingArticleId,
              replacedFields,
              isImporting,
            }}
            basePath={basePath}
            onBack={() => setPreview(null)}
            onConfirm={confirmImport}
          />
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="pubmed-import-query" className="text-sm font-semibold text-text-secondary">
                {t('searchLabel')}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <Input
                    id="pubmed-import-query"
                    className="pl-9"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && query.trim().length > 0) search.execute({ query })
                    }}
                    placeholder={t('searchPlaceholder')}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => search.execute({ query })}
                  disabled={search.isExecuting || query.trim().length === 0}
                  className="inline-flex h-10 shrink-0 items-center rounded-xl bg-gradient-to-b from-coral-500 to-coral-600 px-4 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-50"
                >
                  {search.isExecuting ? t('searching') : t('search')}
                </button>
              </div>
            </div>

            {candidates === null ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-50 text-coral-600 dark:bg-coral-500/15">
                  <FileSearch className="h-5 w-5" />
                </span>
                <p className="font-bold text-text-primary">{t('emptyTitle')}</p>
                <p className="max-w-sm text-sm text-text-secondary">{t('emptyBody')}</p>
              </div>
            ) : candidates.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-secondary">{t('noResults')}</p>
            ) : (
              <>
                <p className="text-sm text-text-secondary">{t('resultsCount', { count: candidates.length })}</p>
                <PubmedImportResults candidates={candidates} onSelect={selectCandidate} pendingPmid={pendingPmid} />
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
