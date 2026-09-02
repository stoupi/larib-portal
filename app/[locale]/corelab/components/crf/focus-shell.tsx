import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'

type FocusShellProps = {
  header: { backHref: string; backLabel: string; title: string; subtitle: string; badge?: ReactNode }
  actions?: ReactNode
  aside?: ReactNode
  children: ReactNode
}

export function FocusShell({ header, actions, aside, children }: FocusShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <div className="flex flex-wrap items-center gap-4 border-b border-border bg-white px-4 py-3 md:px-6">
        <Link href={header.backHref} className="inline-flex items-center gap-2 text-sm text-text-secondary">
          <ArrowLeft className="h-4 w-4" />
          {header.backLabel}
        </Link>
        <span className="h-5 w-px bg-border" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold text-text-primary">{header.title}</h1>
            {header.badge}
          </div>
          <p className="truncate text-xs text-text-secondary">{header.subtitle}</p>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      <div className="flex flex-1 flex-col gap-6 p-4 md:flex-row md:p-6">
        {aside ? <div className="w-full flex-shrink-0 md:w-64">{aside}</div> : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
