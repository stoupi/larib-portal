'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// The library and a study's CRF editor are the same instrument: one frame, three panes,
// one coral band across the top. Everything they share in form lives here and nowhere else.
export function PaneFrame({ header, rail, main, inspector }: {
  header?: ReactNode
  rail: ReactNode
  main: ReactNode
  inspector: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-sm">
      {header}
      <div className="grid lg:grid-cols-[17rem_minmax(0,1fr)_22rem]">
        <aside className="flex h-[min(42rem,calc(100vh-17rem))] min-w-0 flex-col overflow-hidden border-border lg:border-r">{rail}</aside>
        <section className="flex h-[min(42rem,calc(100vh-17rem))] min-w-0 flex-col overflow-hidden">{main}</section>
        <aside className="flex h-[min(42rem,calc(100vh-17rem))] min-w-0 flex-col overflow-hidden border-border lg:border-l">{inspector}</aside>
      </div>
    </div>
  )
}

// The three bands share a height so the coral reads as one strip across the frame.
export function PaneBand({ kind, title, subtitle, action }: {
  kind: string
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="flex min-h-[74px] items-center justify-between gap-4 bg-gradient-to-b from-coral-500 to-coral-600 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-coral-100">{kind}</div>
        <h2 className="m-0 mt-0.5 flex flex-wrap items-center gap-2 text-base font-semibold leading-tight text-white">{title}</h2>
        {subtitle ? <div className="mt-0.5 truncate font-mono text-xs text-coral-100">{subtitle}</div> : null}
      </div>
      {action ? <div className="flex flex-none items-center gap-1.5">{action}</div> : null}
    </header>
  )
}

export function BandButton({ filled, onClick, children }: { filled?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 cursor-pointer items-center rounded-[9px] px-2.5 text-[12.5px]',
        filled
          ? 'bg-white font-semibold text-coral-700'
          : 'border border-white/45 bg-white/15 text-white hover:bg-white/25',
      )}
    >
      {children}
    </button>
  )
}

export function StatStrip({ items, hint }: { items: Array<{ value: string; label: string }>; hint: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 bg-navy-800 px-4 py-2 text-xs text-navy-200">
      {items.map((item, index) => (
        <span key={item.label} className="flex items-center gap-2.5">
          {index > 0 ? <span className="text-navy-400">·</span> : null}
          <span>
            <strong className="font-semibold text-white">{item.value}</strong> {item.label}
          </span>
        </span>
      ))}
      <span className="ml-auto text-navy-300">{hint}</span>
    </div>
  )
}

export function Cap({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-text-secondary">{children}</div>
}

// Both screens pin their actions at the bottom of a pane rather than at the end of a scroll.
export function PaneFooter({ children }: { children: ReactNode }) {
  return <div className="flex gap-2 border-t border-gray-100 bg-gray-25 px-4 py-3">{children}</div>
}

export function RailRow({ label, meta, selected, onClick, leading, trailing, indented, testId }: {
  label: ReactNode
  meta?: ReactNode
  selected: boolean
  onClick: () => void
  leading?: ReactNode
  trailing?: ReactNode
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
        <span className={cn('block truncate text-[13.5px]', selected ? 'font-semibold text-text-primary' : 'text-gray-700')}>{label}</span>
        {meta ? <span className="block truncate text-[11px] text-text-muted">{meta}</span> : null}
      </span>
      {trailing}
    </button>
  )
}

export function EditorInput({ value, onChange, options }: {
  value: string
  onChange: (value: string) => void
  options?: { label?: string; placeholder?: string; mono?: boolean; type?: 'text' | 'number' }
}) {
  const { label, placeholder, mono, type } = options ?? {}
  return (
    <input
      type={type ?? 'text'}
      value={value}
      aria-label={label}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'h-8 w-full rounded-[9px] border border-line bg-white px-2.5 text-[13px] tabular-nums text-text-primary outline-none',
        'focus-visible:border-navy-500 focus-visible:ring-[3px] focus-visible:ring-navy-500/25',
        mono ? 'font-mono' : '',
      )}
    />
  )
}

export function MoveButtons({ disabledUp, disabledDown, onUp, onDown, labels }: {
  disabledUp: boolean
  disabledDown: boolean
  onUp: () => void
  onDown: () => void
  labels: { up: string; down: string }
}) {
  return (
    <span className="hidden flex-none gap-1 group-hover:inline-flex group-data-[selected=true]:inline-flex">
      {([
        { key: 'up' as const, disabled: disabledUp, run: onUp, path: 'm6 15 6-6 6 6', label: labels.up },
        { key: 'down' as const, disabled: disabledDown, run: onDown, path: 'm6 9 6 6 6-6', label: labels.down },
      ]).map((entry) => (
        <button
          key={entry.key}
          type="button"
          aria-label={entry.label}
          disabled={entry.disabled}
          onClick={(event) => {
            event.stopPropagation()
            entry.run()
          }}
          className={cn(
            'inline-flex size-5 items-center justify-center rounded-md border border-line bg-white text-text-secondary',
            entry.disabled ? 'opacity-30' : 'cursor-pointer hover:bg-gray-50 hover:text-text-primary',
          )}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d={entry.path} />
          </svg>
        </button>
      ))}
    </span>
  )
}

export function GripIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      className="flex-none cursor-grab text-gray-200 group-hover:text-gray-400 group-data-[selected=true]:text-gray-400"
    >
      <circle cx="9" cy="6" r="0.6" />
      <circle cx="9" cy="12" r="0.6" />
      <circle cx="9" cy="18" r="0.6" />
      <circle cx="15" cy="6" r="0.6" />
      <circle cx="15" cy="12" r="0.6" />
      <circle cx="15" cy="18" r="0.6" />
    </svg>
  )
}
