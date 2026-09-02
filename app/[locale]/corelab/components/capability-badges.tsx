import { useTranslations } from 'next-intl'

export type Capabilities = {
  canRead: boolean
  canAdjudicate: boolean
  canAuthorReference: boolean
  canCertify: boolean
}

export const CAPABILITY_KEYS = ['canRead', 'canAdjudicate', 'canAuthorReference', 'canCertify'] as const

export function CapabilityBadges({ capabilities }: { capabilities: Capabilities }) {
  const t = useTranslations('corelab.capability')
  const granted = CAPABILITY_KEYS.filter((key) => capabilities[key])
  if (granted.length === 0) return <span className="text-sm text-text-secondary">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {granted.map((key) => (
        <span key={key} className="rounded-md border border-border bg-neutral-50 px-2 py-0.5 text-xs text-text-secondary">
          {t(key)}
        </span>
      ))}
    </div>
  )
}
