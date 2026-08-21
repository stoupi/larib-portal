'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Building2, Pencil, Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateMyAffiliationsAction } from '../actions'

const AFFILIATIONS_MAX = 10

export function MyAffiliationsCard({
  affiliations,
  derivedFromPublications,
}: {
  affiliations: string[]
  derivedFromPublications: boolean
}) {
  const t = useTranslations('publications.myAffiliations')
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>(affiliations)
  const [newAffiliation, setNewAffiliation] = useState('')

  const save = useAction(updateMyAffiliationsAction, {
    onSuccess() {
      toast.success(t('saved'))
      setEditing(false)
      router.refresh()
    },
    onError() {
      toast.error(t('error'))
    },
  })

  function startEditing() {
    setDraft(affiliations)
    setNewAffiliation('')
    setEditing(true)
  }

  function addAffiliation() {
    const value = newAffiliation.trim()
    if (!value || draft.length >= AFFILIATIONS_MAX) return
    setDraft((current) => [...current, value])
    setNewAffiliation('')
  }

  return (
    <section
      aria-label={t('title')}
      className="rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-coral-100 bg-coral-50 text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300">
            <Building2 className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-text-primary">{t('title')}</h2>
            <p className="mt-0.5 max-w-xl text-[13px] leading-relaxed text-text-secondary">
              {derivedFromPublications && !editing ? t('derivedHint') : t('hint')}
            </p>
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-bg-surface px-4 text-[13px] font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            {t('edit')}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <ul className="space-y-2">
            {draft.map((affiliation, index) => (
              <li
                key={`${affiliation}-${index}`}
                className="flex items-center gap-2 rounded-xl border border-line bg-gray-50 dark:bg-white/5 px-3 py-2"
              >
                <span className="flex-1 text-[13px] leading-snug text-text-primary">{affiliation}</span>
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

          <div className="flex flex-wrap gap-2">
            <Input
              className="min-w-[240px] flex-1"
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
            <Button type="button" variant="secondary" className="gap-2" onClick={addAffiliation}>
              <Plus className="h-4 w-4" />
              {t('add')}
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              disabled={save.isExecuting}
              onClick={() => save.execute({ affiliations: draft })}
            >
              {t('save')}
            </Button>
          </div>
        </div>
      ) : affiliations.length === 0 ? (
        <p className="mt-4 text-[13px] text-text-secondary">{t('empty')}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {affiliations.map((affiliation, index) => (
            <li
              key={`${affiliation}-${index}`}
              className="rounded-xl border border-line bg-gray-50 dark:bg-white/5 px-3 py-2 text-[13px] leading-snug text-text-primary"
            >
              {affiliation}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
