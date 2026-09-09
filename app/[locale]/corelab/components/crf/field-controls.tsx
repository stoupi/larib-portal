'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

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

export function ChoiceChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 cursor-pointer rounded-[9px] border px-3.5 text-[13px] transition-colors',
        selected ? 'border-navy-700 bg-navy-700 font-semibold text-white' : 'border-line bg-gray-25 text-text-secondary hover:bg-gray-50',
      )}
    >
      {label}
    </button>
  )
}

export function LabelledInput({
  label, value, onChange, type = 'text', placeholder, changed, invalid,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number'
  placeholder?: string
  changed?: boolean
  invalid?: boolean
}) {
  return (
    <label className="contents">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-8 w-full rounded-[9px] border bg-white px-2.5 text-[13px] text-text-primary tabular-nums outline-none',
          invalid ? 'border-danger-500' : changed ? 'border-coral-300' : 'border-line',
        )}
      />
    </label>
  )
}

export function ReadOnlyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="text-[13px] text-text-secondary">{label}</span>
      <span className="text-[13px] leading-snug text-text-primary">{children}</span>
    </>
  )
}

export function ValueSetChips({ items }: { items: Array<{ label: string; colour: string | null }> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2 py-0.5 text-xs text-gray-700">
          <span className="size-2.5 rounded-[3px] border border-line" style={{ background: item.colour ?? '#ffffff' }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
