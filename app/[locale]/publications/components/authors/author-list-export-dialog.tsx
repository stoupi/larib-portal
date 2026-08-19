'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check, Copy, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  authorListExportToHtml,
  authorListExportToPlainText,
  buildAuthorListExport,
  type ExportableAuthor,
} from '@/lib/publications/author-list-export'

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
  authors,
}: {
  title: string
  authors: ExportableAuthor[]
}) {
  const t = useTranslations('publications.editor.exportList')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const authorList = buildAuthorListExport(title, authors)
  const plainText = authorListExportToPlainText(authorList)

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
        onClick={() => {
          setCopied(false)
          setOpen(true)
        }}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('close')}
            </Button>
            <Button type="button" onClick={onCopy}>
              {copied ? <Check className="h-4 w-4" strokeWidth={2.4} /> : <Copy className="h-4 w-4" strokeWidth={2.2} />}
              {copied ? t('copied') : t('copy')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
