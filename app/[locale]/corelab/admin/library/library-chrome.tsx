'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function LibraryLayout({ rail, main, inspector }: { rail: ReactNode; main: ReactNode; inspector: ReactNode }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[262px_minmax(0,1fr)_348px]">
      <aside className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-sm">{rail}</aside>
      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-sm">{main}</section>
      <aside className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-sm lg:sticky lg:top-4">{inspector}</aside>
    </div>
  )
}

export function RailHeader({ title, count }: { title: string; count: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 bg-gradient-to-b from-coral-500 to-coral-600 px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-white">{title}</span>
      <span className="text-xs text-coral-100">{count}</span>
    </div>
  )
}

export function RailButton({
  label, meta, selected, onClick, trailing, leading, indented, testId,
}: {
  label: ReactNode
  meta?: ReactNode
  selected: boolean
  onClick: () => void
  trailing?: ReactNode
  leading?: ReactNode
  indented?: boolean
  testId?: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={cn(
        'mb-px flex w-full cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-2 text-left hover:bg-gray-50',
        indented ? 'py-1.5' : '',
        selected ? 'bg-coral-50 shadow-[inset_2px_0_0_var(--color-coral-600)]' : '',
      )}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm', selected ? 'font-semibold text-text-primary' : 'text-gray-700')}>{label}</span>
        {meta ? <span className="block truncate text-[11px] text-text-muted">{meta}</span> : null}
      </span>
      {trailing}
    </button>
  )
}

export function PaneHeader({ title, code, badges, action }: { title: string; code?: string; badges?: string[]; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4 bg-gradient-to-b from-coral-500 to-coral-600 px-5 py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-white">{title}</h2>
          {(badges ?? []).map((badge) => (
            <span key={badge} className="rounded-md border border-white/45 bg-white/15 px-1.5 py-px text-[11px] font-medium text-white">
              {badge}
            </span>
          ))}
        </div>
        {code ? <code className="mt-1 block font-mono text-xs text-coral-100">{code}</code> : null}
      </div>
      {action}
    </header>
  )
}

export function SummaryStrip({ items, hint }: { items: Array<{ value: string; label: string }>; hint?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-navy-800 px-5 py-2.5 text-xs text-navy-200">
      {items.map((item, index) => (
        <span key={item.label} className="flex items-center gap-3">
          {index > 0 ? <span className="text-navy-400">·</span> : null}
          <span>
            <strong className="font-semibold text-white">{item.value}</strong> {item.label}
          </span>
        </span>
      ))}
      {hint ? <span className="ml-auto text-navy-300">{hint}</span> : null}
    </div>
  )
}

export function InspectorHeader({ kind, title, subtitle }: { kind: string; title: string; subtitle?: string }) {
  return (
    <header className="bg-gradient-to-b from-coral-500 to-coral-600 px-4 py-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-coral-100">{kind}</div>
      <div className="mt-0.5 text-base font-semibold leading-tight text-white">{title}</div>
      {subtitle ? <div className="mt-0.5 font-mono text-xs text-coral-100">{subtitle}</div> : null}
    </header>
  )
}

export function InspectorSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

export function WarningNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-[10px] border border-warn-100 bg-warn-50 p-3 text-xs leading-relaxed text-warn-700">
      {children}
    </div>
  )
}
