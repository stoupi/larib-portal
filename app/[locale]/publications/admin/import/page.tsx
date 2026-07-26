import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { BacklogImport } from '@/app/[locale]/publications/components/backlog-import'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function PublicationsImportPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
  const t = await getTranslations({ locale, namespace: 'publications' })

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex items-stretch gap-3.5">
          <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
          <div className="space-y-1">
            <nav className="text-sm text-text-muted">
              <Link href="/publications/admin" className="hover:text-coral-600">
                {t('adminHome.title')}
              </Link>
              <span> › </span>
              <span className="text-text-secondary">{t('import.title')}</span>
            </nav>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('import.title')}</h1>
            <p className="max-w-xl text-sm leading-relaxed text-text-secondary">{t('import.subtitle')}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-bg-surface p-6 shadow-elevation-xs">
          <BacklogImport />
        </div>
      </div>
    </div>
  )
}
