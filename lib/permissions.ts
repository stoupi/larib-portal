import type { Application, Role } from '@/app/generated/prisma'

export const ACTIVE_APPLICATIONS = ['BESTOF_LARIB', 'CONGES', 'PUBLICATIONS', 'CORELAB'] as const
export type ActiveApplication = (typeof ACTIVE_APPLICATIONS)[number]

export type AccessPeriodSummary = {
  application: Application
  startsAt: Date | null
  endsAt: Date | null
}

export function toActiveApplications(
  apps: Application[] | null | undefined,
): ActiveApplication[] {
  return (apps ?? []).filter((app): app is ActiveApplication => app !== 'CARDIOLARIB')
}

// Tolerant of optional/null fields: session.user always has them, but some UI
// prop types (e.g. SidebarUser) declare role/applications as optional.
type WithRole = { role?: Role | null }
type WithPeriods = { accessPeriods?: AccessPeriodSummary[] | null }
type WithAdminApps = WithRole & WithPeriods & { adminApplications?: Application[] | null }
type WithAllApps = WithAdminApps & { applications?: Application[] | null }

export function isSuperAdmin(user: WithRole): boolean {
  return user.role === 'ADMIN'
}

export function accessWindowOpen(
  periods: AccessPeriodSummary[] | null | undefined,
  app: Application,
  now: Date = new Date(),
): boolean {
  const period = (periods ?? []).find((candidate) => candidate.application === app)
  if (!period) return true
  if (period.startsAt && now < period.startsAt) return false
  if (period.endsAt && now > period.endsAt) return false
  return true
}

export function canAdminApp(user: WithAdminApps, app: Application, now: Date = new Date()): boolean {
  if (isSuperAdmin(user)) return true
  return (user.adminApplications ?? []).includes(app) && accessWindowOpen(user.accessPeriods, app, now)
}

export function canAccessApp(user: WithAllApps, app: Application, now: Date = new Date()): boolean {
  if (isSuperAdmin(user)) return true
  const granted = (user.applications ?? []).includes(app) || (user.adminApplications ?? []).includes(app)
  return granted && accessWindowOpen(user.accessPeriods, app, now)
}

export function effectiveApplications(
  user: Omit<WithAllApps, 'role'>,
  now: Date = new Date(),
): { applications: Application[]; adminApplications: Application[] } {
  const open = (app: Application) => accessWindowOpen(user.accessPeriods, app, now)
  return {
    applications: (user.applications ?? []).filter(open),
    adminApplications: (user.adminApplications ?? []).filter(open),
  }
}

export function accessibleApplications(
  user: Omit<WithAllApps, 'role'>,
  now: Date = new Date(),
): Application[] {
  const effective = effectiveApplications(user, now)
  return Array.from(new Set([...effective.applications, ...effective.adminApplications]))
}
