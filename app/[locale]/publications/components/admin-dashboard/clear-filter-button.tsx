'use client'

import { X } from 'lucide-react'

export function ClearFilterButton({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClear}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-coral-600 transition hover:bg-coral-50 dark:hover:bg-white/10"
    >
      <X className="size-3.5" strokeWidth={2.6} />
    </button>
  )
}
