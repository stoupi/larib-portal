'use client'

import { useTranslations } from 'next-intl'
import { Download, Users, Building2, BookOpen, FlaskConical, Megaphone, History, Mail } from 'lucide-react'
import type { ComponentType } from 'react'
import { Link } from '@/app/i18n/navigation'

export type ModuleCounts = {
  articles: number
  authors: number
  centres: number
  journals: number
  studies: number
  pendingCommunications: number
  emails: number
}

function ModuleCard({
  href,
  icon: Icon,
  title,
  description,
  count,
}: {
  href: string
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  count?: number
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-coral-50 text-coral-600 dark:bg-coral-500/15 dark:text-coral-300">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-extrabold text-text-primary group-hover:text-coral-600">{title}</span>
        <span className="block truncate text-sm text-text-secondary">{description}</span>
      </span>
      {count != null && (
        <span className="shrink-0 rounded-xl bg-coral-50 px-3 py-1 text-sm font-extrabold text-coral-600 tabular-nums dark:bg-coral-500/15 dark:text-coral-300">
          {count}
        </span>
      )}
    </Link>
  )
}

export function DashboardModules({ counts }: { counts: ModuleCounts }) {
  const t = useTranslations('publications')

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="size-2 rounded-full bg-coral-500" />
        <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-coral-600">{t('adminHome.modules')}</h2>
        <span aria-hidden className="h-px flex-1 bg-line" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ModuleCard
          href="/publications/admin/import"
          icon={Download}
          title={t('import.title')}
          description={t('adminHome.importDescription')}
        />
        <ModuleCard
          href="/publications/admin/communication"
          icon={Megaphone}
          title={t('adminHome.communicationTitle')}
          description={t('adminHome.communicationDescription')}
          count={counts.pendingCommunications}
        />
        <ModuleCard
          href="/publications/admin/authors"
          icon={Users}
          title={t('authors.add.list.title')}
          description={t('adminHome.authorsDescription')}
          count={counts.authors}
        />
        <ModuleCard
          href="/publications/admin/centres"
          icon={Building2}
          title={t('centres.title')}
          description={t('adminHome.centresDescription')}
          count={counts.centres}
        />
        <ModuleCard
          href="/publications/admin/journals"
          icon={BookOpen}
          title={t('journals.title')}
          description={t('adminHome.journalsDescription')}
          count={counts.journals}
        />
        <ModuleCard
          href="/publications/admin/studies"
          icon={FlaskConical}
          title={t('studies.title')}
          description={t('adminHome.studiesDescription')}
          count={counts.studies}
        />
        <ModuleCard
          href="/publications/admin/emails"
          icon={Mail}
          title={t('emails.title')}
          description={t('adminHome.emailsDescription')}
          count={counts.emails}
        />
        <ModuleCard
          href="/publications/admin/logbook"
          icon={History}
          title={t('logbook.title')}
          description={t('adminHome.logbookDescription')}
        />
      </div>
    </section>
  )
}
