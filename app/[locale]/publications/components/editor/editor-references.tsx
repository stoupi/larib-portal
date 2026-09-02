'use client'

import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import type { StudyOption } from '@/lib/services/publications/studies'
import type { PickerAuthor } from '@/lib/publications/author-picker'
import type { EditorForm } from '../article/article-page'
import { CollapsibleCard } from './collapsible-card'
import { DoiLink, PubmedLink } from '../article/doi-link'
import { StatisticianPicker } from '../authors/statistician-picker'
import type { PickerCentre } from '../authors/author-create-panel'
import { setArticleStatisticianAction } from '../../actions'

export type StatisticianSlot = {
  articleId: string
  current: { id: string; firstName: string; lastName: string; degrees: string | null } | null
  authors: PickerAuthor[]
  centres: PickerCentre[]
  articleAuthorIds: string[]
}

export function EditorReferences({
  form,
  studyOptions,
  statistician,
  editable,
}: {
  form: EditorForm
  studyOptions: StudyOption[]
  statistician: StatisticianSlot
  editable: boolean
}) {
  const t = useTranslations('publications')
  const router = useRouter()
  const pubmedId = form.watch('pubmedId')
  const doi = form.watch('doi')
  const studyId = form.watch('studyId')
  const studyLabel = studyOptions.find((option) => option.id === studyId)?.label ?? null

  // The statistician is saved on the spot rather than through the form: it is picked from
  // the author bank, so there is nothing to type and nothing to discard.
  const saveStatistician = useAction(setArticleStatisticianAction, {
    onSuccess() {
      toast.success(t('editor.saved'))
      router.refresh()
    },
    onError() {
      toast.error(t('editor.actionError'))
    },
  })

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
        <div className="grid grid-cols-[80px_1fr] items-center gap-3">
          <span className="text-sm font-semibold text-text-secondary">{t('editor.statistician.label')}</span>
          <StatisticianPicker
            current={statistician.current}
            bank={{ authors: statistician.authors, centres: statistician.centres }}
            articleAuthorIds={statistician.articleAuthorIds}
            editable={editable}
            onSelect={(statisticianId) =>
              saveStatistician.execute({ articleId: statistician.articleId, statisticianId })
            }
          />
        </div>
      </div>
    </CollapsibleCard>
  )
}
