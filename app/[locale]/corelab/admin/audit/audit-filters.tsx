'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SingleSelect } from '@/components/ui/single-select'

type AuditFiltersProps = {
  actors: Array<{ id: string; label: string }>
  studies: Array<{ id: string; code: string }>
  initial: { actorId: string; studyId: string; query: string; from: string; to: string }
}

export function AuditFilters({ actors, studies, initial }: AuditFiltersProps) {
  const t = useTranslations('corelab.audit')
  const router = useRouter()
  const [filters, setFilters] = useState(initial)

  function apply(next: typeof filters) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
    }
    router.push(`/corelab/admin/audit?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-white p-4">
      <div className="space-y-1">
        <label className="text-xs text-text-secondary" htmlFor="audit-from">{t('from')}</label>
        <Input
          id="audit-from" type="date" className="w-40"
          value={filters.from}
          onChange={(event) => setFilters({ ...filters, from: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-text-secondary" htmlFor="audit-to">{t('to')}</label>
        <Input
          id="audit-to" type="date" className="w-40"
          value={filters.to}
          onChange={(event) => setFilters({ ...filters, to: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <span className="block text-xs text-text-secondary">{t('actor')}</span>
        <SingleSelect
          className="w-56"
          placeholder={t('filterActor')}
          options={actors.map((actor) => ({ value: actor.id, label: actor.label }))}
          value={filters.actorId}
          onChange={(value) => setFilters({ ...filters, actorId: value })}
        />
      </div>
      <div className="space-y-1">
        <span className="block text-xs text-text-secondary">{t('filterStudy')}</span>
        <SingleSelect
          className="w-48"
          placeholder={t('filterStudy')}
          options={studies.map((study) => ({ value: study.id, label: study.code }))}
          value={filters.studyId}
          onChange={(value) => setFilters({ ...filters, studyId: value })}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-text-secondary" htmlFor="audit-query">{t('search')}</label>
        <Input
          id="audit-query" className="w-48"
          value={filters.query}
          onChange={(event) => setFilters({ ...filters, query: event.target.value })}
        />
      </div>
      <Button onClick={() => apply(filters)}>{t('apply')}</Button>
      <Button
        variant="ghost"
        onClick={() => {
          const cleared = { actorId: '', studyId: '', query: '', from: '', to: '' }
          setFilters(cleared)
          apply(cleared)
        }}
      >
        {t('reset')}
      </Button>
    </div>
  )
}
