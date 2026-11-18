import type { Application } from '@/app/generated/prisma'
import { toActiveApplications, type ActiveApplication } from '@/lib/permissions'

export const MAX_LEAVE_DAYS = 365

export function applicationsToAdd(
  holder: { applications: Application[]; adminApplications: Application[] },
  requested: Application[],
): ActiveApplication[] {
  const held = new Set<Application>([...holder.applications, ...holder.adminApplications])
  return toActiveApplications(Array.from(new Set(requested)).filter((application) => !held.has(application)))
}

export function leaveDaysToRecord(
  openedApplications: Application[],
  leaveDays: number | null | undefined,
): number | null {
  if (!openedApplications.includes('CONGES')) return null
  return leaveDays ?? null
}
