import { getTypedSession } from '@/lib/auth-helpers'
import { NavbarClient } from './navbar-client'
import { AppSidebar } from './app-sidebar'
import { toActiveApplications, canAdminApp, effectiveApplications } from '@/lib/permissions'
import { countPendingLeaveRequests } from '@/lib/services/conges'

// Always rendered dynamically to reflect auth changes
export const dynamic = 'force-dynamic'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getTypedSession()
  const user = session?.user

  if (!user) {
    return (
      <>
        <NavbarClient user={null} />
        {children}
      </>
    )
  }

  const effective = effectiveApplications(user)
  const pendingLeaveRequestsCount = canAdminApp(user, 'CONGES') ? await countPendingLeaveRequests() : 0

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        user={{
          ...user,
          applications: toActiveApplications(effective.applications),
          adminApplications: toActiveApplications(effective.adminApplications),
        }}
        pendingLeaveRequestsCount={pendingLeaveRequestsCount}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="app-gradient flex-1">{children}</main>
      </div>
    </div>
  )
}
