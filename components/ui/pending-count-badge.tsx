import { cn } from '@/lib/utils'

export function PendingCountBadge({
  count,
  label,
  className,
}: {
  count: number
  label: string
  className?: string
}) {
  if (count <= 0) return null

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-500 px-1.5 text-[11px] font-semibold leading-none text-white',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
