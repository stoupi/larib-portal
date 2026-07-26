import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { listDashboardArticles } from '@/lib/services/publications/dashboard'
import { listJournalNames } from '@/lib/services/publications/journals'
import { AdminArticlesList } from '@/app/[locale]/publications/components/articles/admin-articles-list'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function PublicationsArticlesPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
  const t = await getTranslations({ locale, namespace: 'publications.articles' })
  const [articles, journalNames] = await Promise.all([listDashboardArticles(), listJournalNames()])

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <div className="flex items-stretch gap-3.5">
          <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('title')}</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-secondary">{t('adminSubtitle')}</p>
          </div>
        </div>
        <AdminArticlesList articles={articles} locale={locale} journalNames={journalNames} />
      </div>
    </div>
  )
}
