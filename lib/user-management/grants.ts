import type { Application } from '@/app/generated/prisma'
import { toActiveApplications, type ActiveApplication } from '@/lib/permissions'

export function applicationsToAdd(
  holder: { applications: Application[]; adminApplications: Application[] },
  requested: Application[],
): ActiveApplication[] {
  const held = new Set<Application>([...holder.applications, ...holder.adminApplications])
  return toActiveApplications(Array.from(new Set(requested)).filter((application) => !held.has(application)))
}
