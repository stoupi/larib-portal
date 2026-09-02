'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import type { ActiveApplication } from '@/lib/permissions'

export type AccessPeriodFormValue = {
  application: ActiveApplication
  startsAt?: string | null
  endsAt?: string | null
}

type AccessPeriodFieldsProps = {
  applications: ActiveApplication[]
  value: AccessPeriodFormValue[]
  onChange: (next: AccessPeriodFormValue[]) => void
}

export function AccessPeriodFields({ applications, value, onChange }: AccessPeriodFieldsProps) {
  const t = useTranslations('admin')
  if (applications.length === 0) return null

  function periodFor(application: ActiveApplication): AccessPeriodFormValue {
    return value.find((period) => period.application === application) ?? { application, startsAt: '', endsAt: '' }
  }

  function update(application: ActiveApplication, patch: Partial<AccessPeriodFormValue>) {
    const others = value.filter((period) => period.application !== application)
    onChange([...others, { ...periodFor(application), ...patch }])
  }

  return (
    <section className="rounded-xl border border-line bg-bg-surface p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
        <span className="text-xs font-semibold uppercase tracking-wide text-coral-600">{t('accessPeriodsTitle')}</span>
      </div>
      <p className="mb-4 text-xs text-text-secondary">{t('accessPeriodsHelp')}</p>
      <div className="space-y-3">
        {applications.map((application) => {
          const period = periodFor(application)
          return (
            <div key={application} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
              <span className="text-sm font-medium text-text-primary">{t(`app_${application}`)}</span>
              <label className="flex items-center gap-2 text-xs text-text-secondary">
                {t('accessFrom')}
                <Input type="date" value={period.startsAt ?? ''} onChange={(event) => update(application, { startsAt: event.target.value })} className="w-40" />
              </label>
              <label className="flex items-center gap-2 text-xs text-text-secondary">
                {t('accessUntil')}
                <Input type="date" value={period.endsAt ?? ''} onChange={(event) => update(application, { endsAt: event.target.value })} className="w-40" />
              </label>
            </div>
          )
        })}
      </div>
    </section>
  )
}
