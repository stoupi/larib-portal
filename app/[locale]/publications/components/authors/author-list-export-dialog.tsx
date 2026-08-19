'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Check, Copy, FileText, TriangleAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import {
  authorListExportToHtml,
  authorListExportToPlainText,
  buildAuthorListExport,
  resolveExportableAuthors,
  type ExportCandidate,
} from '@/lib/publications/author-list-export'
import { resolveAuthorAffiliationsAction } from '../../actions'

async function copyRichText(html: string, plainText: string): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      }),
    ])
    return
  }
  await navigator.clipboard.writeText(plainText)
}

export function AuthorListExportDialog({
  title,
  candidates,
}: {
  title: string
  candidates: ExportCandidate[]
}) {
  const t = useTranslations('publications.editor.exportList')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const resolve = useAction(resolveAuthorAffiliationsAction, {
    onError() {
      toast.error(t('resolveError'))
    },
  })

  const authorList = buildAuthorListExport(
    title,
    resolveExportableAuthors(candidates, resolve.result.data ?? {}),
  )
  const plainText = authorListExportToPlainText(authorList)
  const withoutAffiliation = authorList.authors.filter((author) => author.affiliationIndexes.length === 0)

  function onOpen() {
    setCopied(false)
    setOpen(true)
    resolve.execute({ authorIds: candidates.map((candidate) => candidate.authorId) })
  }

  async function onCopy() {
    try {
      await copyRichText(authorListExportToHtml(authorList), plainText)
      setCopied(true)
      toast.success(t('copied'))
    } catch {
      toast.error(t('copyError'))
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-2.5 text-[12px] font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5"
      >
        <FileText className="h-3.5 w-3.5" strokeWidth={2.2} />
        {t('trigger')}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('dialogTitle')}</DialogTitle>
            <DialogDescription>{t('dialogHint')}</DialogDescription>
          </DialogHeader>

          {resolve.isExecuting ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-line bg-gray-50 dark:bg-white/5">
              <Loader />
            </div>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-line bg-gray-50 px-5 py-4 font-serif text-[13.5px] leading-relaxed text-text-primary dark:bg-white/5">
              <p className="text-center text-base font-bold">{authorList.title || t('untitled')}</p>
              <p className="mt-4 text-center">
                {authorList.authors.map((author, authorIndex) => (
                  <span key={`${author.name}-${authorIndex}`}>
                    {authorIndex > 0 && '; '}
                    {authorIndex > 0 && authorIndex === authorList.authors.length - 1 && 'and '}
                    {author.name}
                    {author.affiliationIndexes.length > 0 && <sup>{author.affiliationIndexes.join(',')}</sup>}
                    {author.degrees.length > 0 && `, ${author.degrees.join(', ')}`}
                    {authorIndex === authorList.authors.length - 1 && '.'}
                  </span>
                ))}
              </p>
              <div className="mt-5 space-y-1">
                {authorList.affiliations.map((affiliation) => (
                  <p key={affiliation.index}>
                    <sup>{affiliation.index}</sup> {affiliation.text}
                  </p>
                ))}
              </div>
            </div>
          )}

          {!resolve.isExecuting && withoutAffiliation.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#92400E] dark:border-[#FBBF24]/30 dark:bg-[#FBBF24]/10 dark:text-[#FBBF24]">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
              <span>{t('missingAffiliations', { names: withoutAffiliation.map((author) => author.name).join(', ') })}</span>
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('close')}
            </Button>
            <Button type="button" disabled={resolve.isExecuting} onClick={onCopy}>
              {copied ? <Check className="h-4 w-4" strokeWidth={2.4} /> : <Copy className="h-4 w-4" strokeWidth={2.2} />}
              {copied ? t('copied') : t('copy')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
