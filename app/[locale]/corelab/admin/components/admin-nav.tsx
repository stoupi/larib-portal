'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ShieldCheck } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'

const ITEMS = [
  { key: 'studies', href: '/corelab/admin/studies', enabled: true },
  { key: 'users', href: '/corelab/admin/users', enabled: true },
  { key: 'library', href: '/corelab/admin/library', enabled: false },
  { key: 'audit', href: '/corelab/admin/audit', enabled: false },
] as const

export function CorelabAdminNav() {
  const t = useTranslations('corelab.nav')
  const pathname = usePathname()

  return (
    <div className="flex h-14 items-center gap-6 border-b border-border bg-white px-4 md:px-8">
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        <ShieldCheck className="h-3.5 w-3.5 text-coral-500" />
        {t('section')}
      </span>
      <span className="h-5 w-px bg-border" />
      <nav className="flex h-full items-center gap-1">
        {ITEMS.map((item) => {
          const active = pathname.includes(item.href)
          if (!item.enabled) {
            return (
              <span key={item.key} className="inline-flex h-full cursor-not-allowed items-center px-3.5 text-sm text-neutral-300" title={t('comingSoon')}>
                {t(item.key)}
              </span>
            )
          }
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`inline-flex h-full items-center px-3.5 text-sm ${
                active ? 'font-semibold text-text-primary shadow-[inset_0_-2px_0_var(--color-coral-600,#d61f55)]' : 'text-text-secondary'
              }`}
            >
              {t(item.key)}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
