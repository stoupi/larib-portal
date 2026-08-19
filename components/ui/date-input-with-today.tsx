'use client'

import { CalendarCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function todayAsIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DateInputWithToday({
  value,
  onChange,
  todayLabel,
  className,
}: {
  value: string
  onChange: (value: string) => void
  todayLabel: string
  className?: string
}) {
  const today = todayAsIsoDate()

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full" />
      <button
        type="button"
        onClick={() => onChange(today)}
        aria-pressed={value === today}
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-bold transition',
          value === today
            ? 'border-coral-200 bg-coral-50 text-coral-600 dark:border-coral-500/40 dark:bg-coral-500/15 dark:text-coral-300'
            : 'border-line bg-bg-surface text-text-secondary hover:bg-gray-50 dark:hover:bg-white/5',
        )}
      >
        <CalendarCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
        {todayLabel}
      </button>
    </div>
  )
}
