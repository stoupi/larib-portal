import { getTranslations } from 'next-intl/server'
import { ExternalLink } from 'lucide-react'
import { requireAuth } from '@/lib/auth-guard'
import { isSuperAdmin } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listCorelabUsers } from '@/lib/services/corelab/users'
import { CorelabUsersTable } from './corelab-users-table'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function CorelabUsersPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  const t = await getTranslations({ locale, namespace: 'corelab.users' })

  const users = await listCorelabUsers()

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        {isSuperAdmin(session.user) ? (
          <Button asChild variant="outline" className="gap-2">
            <Link href="/admin/users">
              <ExternalLink className="h-4 w-4" />
              {t('openPortal')}
            </Link>
          </Button>
        ) : null}
      </div>

      <p className="max-w-3xl rounded-xl border border-border bg-white p-4 text-sm text-text-secondary">{t('notice')}</p>

      <section className="rounded-2xl border border-border bg-white p-6">
        <CorelabUsersTable users={users} now={new Date()} />
        <p className="mt-4 text-xs text-text-secondary">{t('footnote')}</p>
      </section>
    </>
  )
}
