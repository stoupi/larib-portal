'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import type { StudyOption } from '@/lib/services/publications/studies'
import type { EditorForm } from '../article/article-page'
import { CollapsibleCard } from './collapsible-card'
import { DoiLink, PubmedLink } from '../article/doi-link'

export function EditorReferences({
  form,
  studyOptions,
  editable,
}: {
  form: EditorForm
  studyOptions: StudyOption[]
  editable: boolean
}) {
  const t = useTranslations('publications')
  const pubmedId = form.watch('pubmedId')
  const doi = form.watch('doi')
  const studyId = form.watch('studyId')
  const studyLabel = studyOptions.find((option) => option.id === studyId)?.label ?? null

  return (
    <CollapsibleCard
      title={
        <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-coral-600">
          <span className="h-2 w-2 rounded-full bg-coral-500" />
          {t('editor.referencesTitle')}
        </span>
      }
    >
      <p className="text-sm text-text-secondary">{t('editor.referencesSubtitle')}</p>

      <div className="mt-4 space-y-3">
        <label className="grid grid-cols-[80px_1fr] items-center gap-3">
          <span className="text-sm font-semibold text-text-secondary">{t('editor.pmid')}</span>
          {editable ? (
            <Input {...form.register('pubmedId')} placeholder={t('editor.addPmid')} />
          ) : (
            <PubmedLink pubmedId={pubmedId} />
          )}
        </label>
        <label className="grid grid-cols-[80px_1fr] items-center gap-3">
          <span className="text-sm font-semibold text-text-secondary">{t('editor.doi')}</span>
          {editable ? (
            <Input {...form.register('doi')} placeholder={t('editor.addDoi')} />
          ) : (
            <DoiLink doi={doi} />
          )}
        </label>
        <label className="grid grid-cols-[80px_1fr] items-center gap-3">
          <span className="text-sm font-semibold text-text-secondary">{t('editor.linkedStudy')}</span>
          {editable ? (
            <select
              {...form.register('studyId')}
              className="h-10 rounded-lg border border-line bg-bg-surface px-3 text-sm text-text-primary outline-none focus:border-coral-400"
            >
              <option value="">{t('editor.selectStudy')}</option>
              {studyOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-text-primary">{studyLabel ?? '—'}</span>
          )}
        </label>
      </div>
    </CollapsibleCard>
  )
}
