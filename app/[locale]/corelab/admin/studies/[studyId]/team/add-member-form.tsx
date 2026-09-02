'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SingleSelect } from '@/components/ui/single-select'
import { CAPABILITY_KEYS, type Capabilities } from '@/app/[locale]/corelab/components/capability-badges'
import { addMemberAction } from '../../../actions'
import type { MemberCandidate } from '@/lib/services/corelab/memberships'

type AddMemberFormProps = {
  studyId: string
  candidates: MemberCandidate[]
  showProductionNotice: boolean
}

function candidateLabel(candidate: MemberCandidate): string {
  const name = [candidate.firstName, candidate.lastName].filter(Boolean).join(' ').trim()
  return name.length > 0 ? `${name} · ${candidate.email}` : candidate.email
}

export function AddMemberForm({ studyId, candidates, showProductionNotice }: AddMemberFormProps) {
  const t = useTranslations('corelab.team')
  const tCapability = useTranslations('corelab.capability')
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [capabilities, setCapabilities] = useState<Capabilities>({
    canRead: true,
    canAdjudicate: false,
    canAuthorReference: false,
    canCertify: false,
  })
  const [trainingDueAt, setTrainingDueAt] = useState('')
  const [calibrationDueAt, setCalibrationDueAt] = useState('')

  const action = useAction(addMemberAction, {
    onSuccess: () => {
      toast.success(t('added'))
      setUserId('')
      setCapabilities({ canRead: true, canAdjudicate: false, canAuthorReference: false, canCertify: false })
      setTrainingDueAt('')
      setCalibrationDueAt('')
      router.refresh()
    },
    onError: ({ error }) => {
      const reason = error.serverError ?? ''
      const known = reason === 'PI_ALREADY_SET' || reason === 'ALREADY_MEMBER'
      toast.error(known ? t(`errors.${reason}`) : t('errors.generic'))
    },
  })

  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <h2 className="text-lg font-semibold text-text-primary">{t('addTitle')}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t('addSubtitle')}</p>

      {showProductionNotice && capabilities.canRead ? (
        <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">{t('productionNotice')}</p>
            <p className="mt-1 text-xs text-amber-800">{t('productionNoticeDetail')}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('person')}</Label>
          <SingleSelect
            options={candidates.map((candidate) => ({ value: candidate.id, label: candidateLabel(candidate) }))}
            value={userId}
            onChange={setUserId}
            placeholder={candidates.length === 0 ? t('noCandidates') : t('personPlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('capabilities')}</Label>
          <div className="flex flex-col gap-2">
            {CAPABILITY_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-3">
                <Switch
                  id={`capability-${key}`}
                  checked={capabilities[key]}
                  onCheckedChange={(next) => setCapabilities((current) => ({ ...current, [key]: next }))}
                />
                <Label htmlFor={`capability-${key}`}>{tCapability(key)}</Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-secondary">{tCapability('help')}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="member-training-due">{t('trainingDue')}</Label>
          <Input id="member-training-due" type="date" value={trainingDueAt} onChange={(event) => setTrainingDueAt(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="member-calibration-due">{t('calibrationDue')}</Label>
          <Input id="member-calibration-due" type="date" value={calibrationDueAt} onChange={(event) => setCalibrationDueAt(event.target.value)} />
        </div>
      </div>

      <Button
        className="mt-5"
        disabled={userId.length === 0 || CAPABILITY_KEYS.every((key) => !capabilities[key]) || action.isPending}
        onClick={() =>
          action.execute({
            studyId,
            userId,
            ...capabilities,
            trainingDueAt: trainingDueAt || null,
            calibrationDueAt: calibrationDueAt || null,
          })
        }
      >
        {t('add')}
      </Button>
    </section>
  )
}
