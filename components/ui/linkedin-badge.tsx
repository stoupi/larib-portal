import { cn } from '@/lib/utils'

const LINKEDIN_BLUE = '#0A66C2'

export function LinkedinBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-4', className)}>
      <rect width="24" height="24" rx="4" fill={LINKEDIN_BLUE} />
      <path
        fill="#ffffff"
        d="M7.2 19.4H4.4V9.7h2.8v9.7zM5.8 8.4a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5zm13.8 11h-2.8v-4.7c0-1.12-.02-2.56-1.56-2.56-1.57 0-1.8 1.22-1.8 2.48v4.78h-2.8V9.7h2.68v1.33h.04c.38-.71 1.3-1.46 2.68-1.46 2.87 0 3.4 1.89 3.4 4.34v5.49z"
      />
    </svg>
  )
}
