import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp, canAdminApp } from '@/lib/permissions'
import { CorelabAdminNav } from './components/admin-nav'

type LayoutProps = { children: ReactNode; params: Promise<{ locale: 'en' | 'fr' }> }

export default async function CorelabAdminLayout({ children, params }: LayoutProps) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  return (
    <div className="min-h-full">
      <CorelabAdminNav isDataManager={canAdminApp(session.user, 'CORELAB')} />
      <div className="app-gradient min-h-full px-4 py-8 md:px-8">
        <div className="mx-auto max-w-[1400px] space-y-6">{children}</div>
      </div>
    </div>
  )
}
