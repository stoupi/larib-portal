'use client'

import { useTranslations } from 'next-intl'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ARTICLE_STATUS_VALUES } from '@/lib/publications/status-display'
import { ARTICLE_TYPE_VALUES } from '@/lib/publications/article-type'
import {
  ALL_ADMIN_FILTER,
  DEFAULT_ADMIN_ARTICLE_FILTERS,
  NO_STUDY_FILTER,
  adminArticleFiltersActive,
  type AdminArticleFilters,
} from '@/lib/publications/admin-article-stats'

function FilterSelect({
  label,
  value,
  active,
  onChange,
  children,
}: {
  label: string
  value: string
  active: boolean
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className="text-[12px] font-bold text-text-primary">{label}</span>
      <div className="relative">
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'h-7 max-w-[124px] cursor-pointer appearance-none truncate rounded-full pl-2.5 pr-6 text-[12px] font-bold outline-none transition',
            active ? 'bg-coral-50 text-coral-600 dark:bg-coral-500/15 dark:text-coral-300' : 'bg-gray-100 text-text-secondary dark:bg-white/10',
          )}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 opacity-70" strokeWidth={2.4} />
      </div>
    </div>
  )
}

export function AdminArticlesFilters({
  value,
  studies,
  journals,
  onChange,
}: {
  value: AdminArticleFilters
  studies: string[]
  journals: string[]
  onChange: (patch: Partial<AdminArticleFilters>) => void
}) {
  const t = useTranslations('publications')

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-line bg-bg-surface px-3 py-1.5 shadow-elevation-xs">
      <FilterSelect
        label={t('myPub.col.status')}
        value={value.status}
        active={value.status !== ALL_ADMIN_FILTER}
        onChange={(status) => onChange({ status })}
      >
        <option value={ALL_ADMIN_FILTER}>{t('myPub.filters.allStatuses')}</option>
        {ARTICLE_STATUS_VALUES.map((status) => (
          <option key={status} value={status}>
            {t(`articles.status.${status}`)}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label={t('myPub.col.study')}
        value={value.study}
        active={value.study !== ALL_ADMIN_FILTER}
        onChange={(study) => onChange({ study })}
      >
        <option value={ALL_ADMIN_FILTER}>{t('myPub.filters.allStudies')}</option>
        {studies.map((study) => (
          <option key={study} value={study}>
            {study}
          </option>
        ))}
        <option value={NO_STUDY_FILTER}>{t('myPub.filters.noStudy')}</option>
      </FilterSelect>

      <FilterSelect
        label={t('myPub.col.journal')}
        value={value.journal}
        active={value.journal !== ALL_ADMIN_FILTER}
        onChange={(journal) => onChange({ journal })}
      >
        <option value={ALL_ADMIN_FILTER}>{t('articles.filters.allJournals')}</option>
        {journals.map((journal) => (
          <option key={journal} value={journal}>
            {journal}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label={t('myPub.col.type')}
        value={value.type}
        active={value.type !== ALL_ADMIN_FILTER}
        onChange={(type) => onChange({ type })}
      >
        <option value={ALL_ADMIN_FILTER}>{t('myPub.filters.allTypes')}</option>
        {ARTICLE_TYPE_VALUES.map((type) => (
          <option key={type} value={type}>
            {t(`myPub.type.${type}`)}
          </option>
        ))}
      </FilterSelect>

      {adminArticleFiltersActive(value) && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_ADMIN_ARTICLE_FILTERS)}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-semibold text-text-secondary transition hover:bg-gray-100 dark:hover:bg-white/5"
        >
          <X className="h-3 w-3" strokeWidth={2.4} />
          {t('myPub.filters.reset')}
        </button>
      )}
    </div>
  )
}
