import { useTranslations, useFormatter } from 'next-intl'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CorelabUser } from '@/lib/services/corelab/users'

function userName(user: CorelabUser): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name.length > 0 ? name : user.email
}

export function CorelabUsersTable({ users, now }: { users: CorelabUser[]; now: Date }) {
  const t = useTranslations('corelab.users')
  const tRole = useTranslations('corelab.role')
  const format = useFormatter()

  if (users.length === 0) {
    return <p className="text-sm text-text-secondary">{t('empty')}</p>
  }

  function accessLabel(user: CorelabUser): string {
    const period = user.accessPeriods.find((candidate) => candidate.application === 'CORELAB')
    if (!period) return t('permanent')
    const day = (value: Date) => format.dateTime(value, { dateStyle: 'medium', timeZone: 'UTC' })
    if (period.endsAt && period.endsAt < now) return t('expired', { date: day(period.endsAt) })
    if (period.startsAt && period.startsAt > now) return t('from', { date: day(period.startsAt) })
    if (period.endsAt) return t('until', { date: day(period.endsAt) })
    if (period.startsAt) return t('since', { date: day(period.startsAt) })
    return t('permanent')
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('user')}</TableHead>
            <TableHead>{t('access')}</TableHead>
            <TableHead>{t('studies')}</TableHead>
            <TableHead>{t('lastLogin')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="font-medium text-text-primary">{userName(user)}</div>
                <div className="text-xs text-text-secondary">{user.email}</div>
              </TableCell>
              <TableCell className="text-sm text-text-secondary">{accessLabel(user)}</TableCell>
              <TableCell>
                {user.corelabMemberships.length === 0 ? (
                  <span className="text-sm text-text-secondary">{t('noStudy')}</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {user.corelabMemberships.map((membership) => (
                      <span
                        key={membership.study.id}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-neutral-50 px-2 py-0.5 text-xs text-text-secondary"
                      >
                        <span className="font-medium text-text-primary">{membership.study.code}</span>
                        <span>·</span>
                        <span>{tRole(membership.role)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-sm text-text-secondary">
                {user.sessions.length === 0
                  ? t('never')
                  : format.dateTime(user.sessions[0].updatedAt, { dateStyle: 'medium', timeStyle: 'short' })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
