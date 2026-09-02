'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/app/i18n/navigation'

export function StudyTabs({ studyId }: { studyId: string }) {
  const t = useTranslations('corelab.tabs')
  const pathname = usePathname()
  const base = `/corelab/admin/studies/${studyId}`
  const tabs = [
    { key: 'config', href: base, enabled: true },
    { key: 'team', href: `${base}/team`, enabled: true },
    { key: 'calibration', href: `${base}/calibration`, enabled: false },
    { key: 'patients', href: `${base}/patients`, enabled: false },
    { key: 'discordance', href: `${base}/discordance`, enabled: false },
    { key: 'export', href: `${base}/export`, enabled: false },
  ] as const

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active = tab.key === 'config' ? pathname.endsWith(studyId) : pathname.endsWith(tab.href.split('/').pop() ?? '')
        if (!tab.enabled) {
          return (
            <span key={tab.key} className="cursor-not-allowed px-3.5 py-2 text-sm text-neutral-300">
              {t(tab.key)}
            </span>
          )
        }
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`px-3.5 py-2 text-sm ${active ? 'font-semibold text-text-primary shadow-[inset_0_-2px_0_var(--color-coral-600,#d61f55)]' : 'text-text-secondary'}`}
          >
            {t(tab.key)}
          </Link>
        )
      })}
    </nav>
  )
}
