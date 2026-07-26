'use client'

import { cn } from '@/lib/utils'

export function StatSectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-extrabold uppercase tracking-[0.07em] text-text-muted">{children}</span>
}

export function StatBar({
  label,
  count,
  pct,
  color,
  toggle,
}: {
  label: string
  count: number
  pct: number
  color: { hex?: string; className?: string }
  toggle?: { active: boolean; onClick: () => void }
}) {
  const active = toggle?.active ?? false
  const content = (
    <>
      <span
        className={cn(
          'w-[104px] shrink-0 truncate text-[11.5px] font-semibold',
          active ? 'text-coral-600 dark:text-coral-300' : 'text-text-secondary',
        )}
        title={label}
      >
        {label}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-md bg-gray-100 dark:bg-white/10">
        <div className={cn('h-full rounded-md', color.className)} style={{ width: `${pct}%`, backgroundColor: color.hex }} />
      </div>
      <span className="w-4 text-right text-xs font-extrabold text-text-primary tabular-nums">{count}</span>
    </>
  )

  if (!toggle) return <div className="flex items-center gap-2.5">{content}</div>

  return (
    <button
      type="button"
      onClick={toggle.onClick}
      aria-pressed={active}
      className={cn(
        '-mx-1.5 flex w-full items-center gap-2.5 rounded-md px-1.5 py-0.5 text-left transition',
        active ? 'bg-coral-50 dark:bg-coral-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5',
      )}
    >
      {content}
    </button>
  )
}
