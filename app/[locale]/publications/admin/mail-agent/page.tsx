import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { isMailAgentStale } from '@/lib/publications/mail-agent'
import {
  getMailAgentLastRunAt,
  listPendingMailSuggestions,
  listResolvedMailSuggestions,
} from '@/lib/services/publications/mail-suggestions'
import { listDashboardArticles } from '@/lib/services/publications/dashboard'
import { BackToDashboard } from '@/app/[locale]/publications/components/back-to-dashboard'
import { SuggestionList } from '@/app/[locale]/publications/components/mail-agent/suggestion-list'
import { SuggestionHistory } from '@/app/[locale]/publications/components/mail-agent/suggestion-history'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function PublicationsMailAgentPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))

  const [t, pending, resolved, articles, lastRunAt] = await Promise.all([
    getTranslations({ locale, namespace: 'publications.mailAgent' }),
    listPendingMailSuggestions(),
    listResolvedMailSuggestions(),
    listDashboardArticles(),
    getMailAgentLastRunAt(),
  ])
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
  const isStale = isMailAgentStale(lastRunAt, new Date())

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1100px] space-y-6">
        <BackToDashboard locale={locale} />
        <header className="flex items-stretch gap-3.5">
          <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('title')}</h1>
            <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-text-primary">{t('subtitle')}</p>
          </div>
        </header>

        <p
          role="status"
          className={
            isStale
              ? 'rounded-xl border border-coral-500/40 bg-coral-50 px-4 py-3 text-base font-semibold text-coral-700 dark:bg-coral-500/15 dark:text-coral-300'
              : 'text-base text-text-primary'
          }
        >
          {lastRunAt ? t('lastRun', { date: formatter.format(lastRunAt) }) : t('neverRan')}
          {lastRunAt && isStale && ` ${t('stale')}`}
        </p>

        <section aria-label={t('pendingTitle')} className="space-y-3">
          <h2 className="text-base font-extrabold uppercase tracking-[0.1em] text-coral-600">
            {t('pendingTitle')} · {pending.length}
          </h2>
          <SuggestionList suggestions={pending} articles={articles} />
        </section>

        <section aria-label={t('historyTitle')} className="space-y-3">
          <h2 className="text-base font-extrabold uppercase tracking-[0.1em] text-coral-600">{t('historyTitle')}</h2>
          <SuggestionHistory suggestions={resolved} />
        </section>
      </div>
    </div>
  )
}
