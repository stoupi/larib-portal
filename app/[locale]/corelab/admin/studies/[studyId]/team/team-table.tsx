'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations, useFormatter } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PhaseTrack } from '@/app/[locale]/corelab/components/phase-track'
import { CapabilityBadges } from '@/app/[locale]/corelab/components/capability-badges'
import { removeMemberAction } from '../../../actions'
import type { StudyMember } from '@/lib/services/corelab/memberships'

function memberName(member: StudyMember): string {
  const name = [member.user.firstName, member.user.lastName].filter(Boolean).join(' ').trim()
  return name.length > 0 ? name : member.user.email
}

export function TeamTable({ studyId, members }: { studyId: string; members: StudyMember[] }) {
  const t = useTranslations('corelab.team')
  const format = useFormatter()
  const router = useRouter()
  const [pendingRemoval, setPendingRemoval] = useState<StudyMember | null>(null)

  const action = useAction(removeMemberAction, {
    onSuccess: () => {
      toast.success(t('removed'))
      setPendingRemoval(null)
      router.refresh()
    },
    onError: () => toast.error(t('errors.generic')),
  })

  if (members.length === 0) {
    return <p className="text-sm text-text-secondary">{t('empty')}</p>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('member')}</TableHead>
              <TableHead>{t('capabilities')}</TableHead>
              <TableHead>{t('track')}</TableHead>
              <TableHead>{t('joinedOn')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="font-medium text-text-primary">{memberName(member)}</div>
                  <div className="text-xs text-text-secondary">{member.user.email}</div>
                </TableCell>
                <TableCell>
                  <CapabilityBadges capabilities={member} />
                </TableCell>
                <TableCell>
                  <PhaseTrack phase={member.canRead ? member.certificationPhase : null} />
                </TableCell>
                <TableCell className="text-text-secondary">
                  {format.dateTime(member.joinedAt, { dateStyle: 'long', timeZone: 'UTC' })}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setPendingRemoval(member)}>
                    {t('remove')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-4 text-xs text-text-secondary">{t('footnote')}</p>

      <AlertDialog open={pendingRemoval !== null} onOpenChange={(open) => setPendingRemoval(open ? pendingRemoval : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeTitle', { name: pendingRemoval ? memberName(pendingRemoval) : '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t('removeDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemoval) action.execute({ studyId, membershipId: pendingRemoval.id })
              }}
            >
              {t('confirmRemove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
