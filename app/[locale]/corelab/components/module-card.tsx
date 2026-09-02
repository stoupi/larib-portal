import { useTranslations } from 'next-intl'
import { CheckCircle2, Lock, PlayCircle } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import type { ModuleStatus } from '@/lib/corelab/training/progress'

type ModuleCardProps = {
  module: ModuleStatus
  locked: boolean
  href: string | null
}

export function ModuleCard({ module, locked, href }: ModuleCardProps) {
  const t = useTranslations('corelab.training')
  const state = module.completed ? 'done' : locked ? 'locked' : 'todo'

  const body = (
    <div
      className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${
        locked ? 'border-border bg-neutral-50 opacity-70' : 'border-border bg-white'
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{module.title}</p>
        <p className="mt-0.5 text-xs text-text-secondary">
          {[t(`type.${module.type}`), t(`scope.${module.scope}`)].join(' · ')}
        </p>
        {module.recognisedFromElsewhere ? (
          <p className="mt-1 text-xs text-emerald-700">{t('recognised')}</p>
        ) : null}
      </div>
      <span
        className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium ${
          state === 'done'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : state === 'locked'
              ? 'border-neutral-200 bg-neutral-100 text-neutral-500'
              : 'border-coral-200 bg-coral-50 text-coral-600'
        }`}
      >
        {state === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : state === 'locked' ? <Lock className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
        {t(`state.${state}`)}
      </span>
    </div>
  )

  if (locked || !href) return body
  return (
    <Link href={href} className="block">
      {body}
    </Link>
  )
}
