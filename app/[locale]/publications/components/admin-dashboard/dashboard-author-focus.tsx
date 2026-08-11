'use client'

import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuthorFocus } from '@/lib/publications/admin-dashboard'
import type { PositionBucket } from '@/lib/publications/status-display'

export function DashboardAuthorFocus({
  focus,
  activePosition,
  onSelectPosition,
  onClear,
}: {
  focus: AuthorFocus
  activePosition: string
  onSelectPosition: (bucket: PositionBucket) => void
  onClear: (() => void) | null
}) {
  const t = useTranslations('publications.adminHome.authorFocus')
  const tPosition = useTranslations('publications.myPub.position')

  return (
    <section className="rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-coral-600">
          {t('title', { name: focus.name })}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">{t('total', { count: focus.total })}</span>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-line px-2.5 text-[11px] font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <X className="size-3" strokeWidth={2.4} />
              {t('clear')}
            </button>
          )}
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {focus.positions.map((position) => {
          const active = activePosition === position.bucket
          return (
            <li key={position.bucket}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelectPosition(position.bucket)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2.5 text-left transition hover:border-coral-200 hover:bg-coral-50/60 dark:hover:border-coral-500/30 dark:hover:bg-coral-500/10',
                  active
                    ? 'border-coral-500 bg-coral-50 dark:border-coral-500/60 dark:bg-coral-500/15'
                    : 'border-line',
                )}
              >
                <p className="text-2xl font-extrabold leading-none text-text-primary tabular-nums">{position.count}</p>
                <p className="mt-1 truncate text-xs text-text-secondary">{tPosition(position.bucket)}</p>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
