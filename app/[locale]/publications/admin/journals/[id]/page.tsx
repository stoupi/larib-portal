import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { getJournalById } from '@/lib/services/publications/journals'
import { JournalForm } from '@/app/[locale]/publications/components/journals/journal-form'
import { BackToDashboard } from '@/app/[locale]/publications/components/back-to-dashboard'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; id: string }> }

export default async function EditJournalPage({ params }: PageParams) {
  const { locale, id } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
  const journal = await getJournalById(id)
  if (!journal) notFound()
  const t = await getTranslations({ locale, namespace: 'publications.journals' })

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1100px] space-y-6">
        <BackToDashboard locale={locale} />
        <div className="flex items-stretch gap-3.5">
          <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
          <div className="space-y-1">
            <nav className="text-sm text-text-muted">
              <Link href="/publications/admin/journals" className="hover:text-coral-600">
                {t('title')}
              </Link>
              <span> › </span>
              <span className="font-semibold text-text-secondary">{journal.name}</span>
            </nav>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('editTitle')}</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">{t('editSubtitle')}</p>
          </div>
        </div>
        <JournalForm journal={journal} />
      </div>
    </div>
  )
}
