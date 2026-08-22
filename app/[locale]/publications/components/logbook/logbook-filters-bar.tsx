'use client'

import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { useRouter } from '@/app/i18n/navigation'
import { Input } from '@/components/ui/input'
import { SingleSelect, type SingleSelectOption } from '@/components/ui/single-select'
import {
  hasActiveLogbookFilter,
  logbookFiltersToQuery,
  oneOf,
  LOGBOOK_ACTIONS,
  LOGBOOK_ENTITIES,
  LOGBOOK_FILTERABLE_FIELDS,
  EMPTY_LOGBOOK_FILTERS,
  type LogbookFilters,
} from '@/lib/publications/logbook-filters'
import { logbookFieldKey } from '@/lib/publications/logbook-labels'
import type { LogbookActor } from '@/lib/services/publications/logbook'

const LOGBOOK_PATH = '/publications/admin/logbook'
const ANY = ''

export function LogbookFiltersBar({ filters, actors }: { filters: LogbookFilters; actors: LogbookActor[] }) {
  const t = useTranslations('publications.logbook')
  const router = useRouter()

  const navigate = (next: LogbookFilters): void => {
    const query = logbookFiltersToQuery(next).toString()
    router.replace(query.length > 0 ? `${LOGBOOK_PATH}?${query}` : LOGBOOK_PATH)
  }

  // Enter and losing focus both land here, so ignore the second one.
  const searchFor = (value: string): void => {
    const query = value.trim() || null
    if (query !== filters.query) navigate({ ...filters, query })
  }

  // Only the filters this bar exposes are cleared: a logbook scoped to one publication
  // must not silently widen to the whole journal.
  const clearVisibleFilters = (): void => {
    navigate({ ...EMPTY_LOGBOOK_FILTERS, articleId: filters.articleId })
  }

  const actorOptions: SingleSelectOption[] = [
    { label: t('filters.allActors'), value: ANY },
    ...actors.map((actor) => ({ label: actor.label, value: actor.id })),
  ]

  const entityOptions: SingleSelectOption[] = [
    { label: t('filters.allEntities'), value: ANY },
    ...LOGBOOK_ENTITIES.map((entity) => ({ label: t(`entities.${entity}`), value: entity })),
  ]

  const actionOptions: SingleSelectOption[] = [
    { label: t('filters.allActions'), value: ANY },
    ...LOGBOOK_ACTIONS.map((action) => ({ label: t(`actions.${action}`), value: action })),
  ]

  const fieldOptions: SingleSelectOption[] = [
    { label: t('filters.allFields'), value: ANY },
    ...LOGBOOK_FILTERABLE_FIELDS.map((field) => ({ label: t(logbookFieldKey(field)), value: field })),
  ]

  return (
    <div className="rounded-2xl border border-line bg-bg-surface p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5">
          <span className="block text-[12px] font-bold text-text-secondary">{t('filters.actor')}</span>
          <SingleSelect
            options={actorOptions}
            value={filters.actorId ?? ANY}
            onChange={(value) => navigate({ ...filters, actorId: value || null })}
            searchable
            placeholder={t('filters.allActors')}
          />
        </label>

        <label className="space-y-1.5">
          <span className="block text-[12px] font-bold text-text-secondary">{t('filters.entity')}</span>
          <SingleSelect
            options={entityOptions}
            value={filters.entity ?? ANY}
            onChange={(value) => navigate({ ...filters, entity: oneOf(value, LOGBOOK_ENTITIES) })}
            placeholder={t('filters.allEntities')}
          />
        </label>

        <label className="space-y-1.5">
          <span className="block text-[12px] font-bold text-text-secondary">{t('filters.action')}</span>
          <SingleSelect
            options={actionOptions}
            value={filters.action ?? ANY}
            onChange={(value) => navigate({ ...filters, action: oneOf(value, LOGBOOK_ACTIONS) })}
            placeholder={t('filters.allActions')}
          />
        </label>

        <label className="space-y-1.5">
          <span className="block text-[12px] font-bold text-text-secondary">{t('filters.field')}</span>
          <SingleSelect
            options={fieldOptions}
            value={filters.field ?? ANY}
            onChange={(value) => navigate({ ...filters, field: oneOf(value, LOGBOOK_FILTERABLE_FIELDS) })}
            placeholder={t('filters.allFields')}
          />
        </label>

        <label className="space-y-1.5">
          <span className="block text-[12px] font-bold text-text-secondary">{t('filters.from')}</span>
          <Input
            type="date"
            className="h-9"
            defaultValue={filters.from ?? ''}
            onChange={(event) => navigate({ ...filters, from: event.target.value || null })}
          />
        </label>

        <label className="space-y-1.5">
          <span className="block text-[12px] font-bold text-text-secondary">{t('filters.to')}</span>
          <Input
            type="date"
            className="h-9"
            defaultValue={filters.to ?? ''}
            onChange={(event) => navigate({ ...filters, to: event.target.value || null })}
          />
        </label>

        <label className="space-y-1.5 xl:col-span-2">
          <span className="block text-[12px] font-bold text-text-secondary">{t('filters.search')}</span>
          <Input
            type="search"
            className="h-9"
            defaultValue={filters.query ?? ''}
            placeholder={t('filters.searchPlaceholder')}
            onKeyDown={(event) => {
              if (event.key === 'Enter') searchFor(event.currentTarget.value)
            }}
            onBlur={(event) => searchFor(event.target.value)}
          />
        </label>
      </div>

      {hasActiveLogbookFilter(filters) && (
        <button
          type="button"
          onClick={clearVisibleFilters}
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-coral-600 hover:underline"
        >
          <X aria-hidden className="size-3.5" />
          {t('filters.reset')}
        </button>
      )}
    </div>
  )
}
