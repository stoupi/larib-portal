import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { listPublicationEmails } from '@/lib/services/publications/email-log'
import { listRecapAudience, listRecapCopyRecipients } from '@/lib/services/publications/recap'
import { listAcceptedRecapRecipients } from '@/lib/services/publications/accepted-recap'
import { BackToDashboard } from '@/app/[locale]/publications/components/back-to-dashboard'
import { EmailLogTable } from '@/app/[locale]/publications/components/emails/email-log-table'
import { RecapAudience } from '@/app/[locale]/publications/components/emails/recap-audience'
import { AcceptedRecapSection } from '@/app/[locale]/publications/components/emails/accepted-recap-section'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function PublicationsEmailsPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))

  const [t, entries, audience, copyRecipients, acceptedRecipients] = await Promise.all([
    getTranslations({ locale, namespace: 'publications.emails' }),
    listPublicationEmails(),
    listRecapAudience(),
    listRecapCopyRecipients(),
    listAcceptedRecapRecipients(),
  ])

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <BackToDashboard locale={locale} />
        <header className="flex items-stretch gap-3.5">
          <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('title')}</h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-text-secondary">{t('subtitle')}</p>
          </div>
        </header>
        <RecapAudience members={audience} copyRecipients={copyRecipients} />
        <AcceptedRecapSection recipients={acceptedRecipients} />
        <EmailLogTable entries={entries} />
      </div>
    </div>
  )
}
