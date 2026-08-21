'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Building2, ChevronDown, ChevronUp, Plus, Save, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { updateMyAffiliationsAction } from '../actions'

const AFFILIATIONS_MAX = 10
const CORAL = 'gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105'

function moved(affiliations: string[], from: number, to: number): string[] {
  if (to < 0 || to >= affiliations.length) return affiliations
  const reordered = [...affiliations]
  const [moving] = reordered.splice(from, 1)
  reordered.splice(to, 0, moving)
  return reordered
}

export function MyAffiliationsDialog({
  affiliations,
  derivedFromPublications,
  compact = false,
}: {
  affiliations: string[]
  derivedFromPublications: boolean
  compact?: boolean
}) {
  const t = useTranslations('publications.myAffiliations')
  const tAuthors = useTranslations('publications.authors')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(affiliations)
  const [newAffiliation, setNewAffiliation] = useState('')

  const save = useAction(updateMyAffiliationsAction, {
    onSuccess() {
      toast.success(t('saved'))
      setOpen(false)
      router.refresh()
    },
    onError() {
      toast.error(t('error'))
    },
  })

  function openDialog(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setDraft(affiliations)
      setNewAffiliation('')
    }
  }

  function addAffiliation() {
    const value = newAffiliation.trim()
    if (!value || draft.length >= AFFILIATIONS_MAX) return
    setDraft((current) => [...current, value])
    setNewAffiliation('')
  }

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
          <Building2 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2.2} />
          {t('title')}
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <section className="space-y-4 rounded-2xl border border-line bg-bg-surface p-5">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-coral-500" />
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-coral-600">
              {tAuthors('add.affiliations')}
            </h3>
            <span className="text-xs font-normal normal-case text-text-muted">
              {tAuthors('add.affiliationsHint')}
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {derivedFromPublications && draft.length > 0 && (
            <p className="text-[13px] leading-relaxed text-text-secondary">{t('derivedHint')}</p>
          )}

          <ul className="space-y-2">
            {draft.map((affiliation, index) => (
              <li
                key={`${affiliation}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-gray-25 px-4 py-3 dark:bg-white/5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-600">
                  {index + 1}
                </span>
                <span className="flex-1 text-sm leading-snug text-text-primary">{affiliation}</span>
                <span className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label={t('moveUp', { affiliation })}
                    disabled={index === 0}
                    onClick={() => setDraft(moved(draft, index, index - 1))}
                    className="text-text-muted transition hover:text-coral-600 disabled:opacity-30 disabled:hover:text-text-muted"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t('moveDown', { affiliation })}
                    disabled={index === draft.length - 1}
                    onClick={() => setDraft(moved(draft, index, index + 1))}
                    className="text-text-muted transition hover:text-coral-600 disabled:opacity-30 disabled:hover:text-text-muted"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </span>
                <button
                  type="button"
                  aria-label={t('remove', { affiliation })}
                  onClick={() => setDraft(draft.filter((_, position) => position !== index))}
                  className="text-text-muted transition hover:text-coral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          {draft.length === 0 && <p className="text-[13px] text-text-secondary">{t('empty')}</p>}

          <div className="flex gap-2">
            <Input
              value={newAffiliation}
              aria-label={t('addLabel')}
              placeholder={t('addPlaceholder')}
              onChange={(event) => setNewAffiliation(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addAffiliation()
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addAffiliation} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('add')}
            </Button>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            disabled={save.isExecuting}
            onClick={() => save.execute({ affiliations: draft })}
            className={CORAL}
          >
            <Save className="h-4 w-4" />
            {t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
