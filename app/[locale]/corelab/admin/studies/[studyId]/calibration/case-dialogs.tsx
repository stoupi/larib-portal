'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Plus, Upload, UserPlus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { assignCasesAction, createCaseAction, importCasesAction } from '../../../actions-calibration'

type Reader = { id: string; label: string }
type CaseOption = { id: string; code: string }

export function CaseDialogs({ studyId, cases, readers }: { studyId: string; cases: CaseOption[]; readers: Reader[] }) {
  const t = useTranslations('corelab.calibration')
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [code, setCode] = useState('')
  const [examDate, setExamDate] = useState('')
  const [examLabel, setExamLabel] = useState('Baseline')
  const [csv, setCsv] = useState('')
  const [selectedCases, setSelectedCases] = useState<string[]>([])
  const [selectedReaders, setSelectedReaders] = useState<string[]>([])

  const create = useAction(createCaseAction, {
    onSuccess: () => {
      toast.success(t('caseCreated'))
      setCreateOpen(false)
      setCode('')
      setExamDate('')
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  const importAction = useAction(importCasesAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      if (!data.ok) {
        toast.error(data.errors.join(' · '))
        return
      }
      toast.success(t('imported', { count: data.created }))
      setImportOpen(false)
      setCsv('')
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  const assign = useAction(assignCasesAction, {
    onSuccess: ({ data }) => {
      toast.success(t('assigned', { count: data?.created ?? 0 }))
      setAssignOpen(false)
      setSelectedCases([])
      setSelectedReaders([])
      router.refresh()
    },
    onError: ({ error }) => toast.error(error.serverError === 'READER_NOT_IN_CALIBRATION' ? t('assignHelp') : t('error')),
  })

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            {t('importCsv')}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('importTitle')}</DialogTitle>
            <DialogDescription>{t('importHelp')}</DialogDescription>
          </DialogHeader>
          <Textarea rows={8} value={csv} onChange={(event) => setCsv(event.target.value)} />
          <DialogFooter>
            <Button disabled={csv.trim().length === 0 || importAction.isPending} onClick={() => importAction.execute({ studyId, content: csv })}>
              {t('importRun')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            {t('assign')}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('assignTitle')}</DialogTitle>
            <DialogDescription>{t('assignHelp')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('casesTitle')}</Label>
              {cases.map((calibrationCase) => (
                <label key={calibrationCase.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedCases.includes(calibrationCase.id)}
                    onCheckedChange={() => setSelectedCases((current) => toggle(current, calibrationCase.id))}
                  />
                  {calibrationCase.code}
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <Label>{t('reader')}</Label>
              {readers.length === 0 ? (
                <p className="text-sm text-text-secondary">{t('noEligibleReader')}</p>
              ) : (
                readers.map((reader) => (
                  <label key={reader.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedReaders.includes(reader.id)}
                      onCheckedChange={() => setSelectedReaders((current) => toggle(current, reader.id))}
                    />
                    {reader.label}
                  </label>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={selectedCases.length === 0 || selectedReaders.length === 0 || assign.isPending}
              onClick={() => assign.execute({ studyId, caseIds: selectedCases, userIds: selectedReaders })}
            >
              {t('assignRun')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t('newCase')}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newCaseTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="case-code">{t('caseCode')}</Label>
              <Input id="case-code" value={code} onChange={(event) => setCode(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="case-date">{t('examDate', { index: 1 })}</Label>
              <Input id="case-date" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="case-label">{t('examLabel', { index: 1 })}</Label>
              <Input id="case-label" value={examLabel} onChange={(event) => setExamLabel(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={examDate === '' || create.isPending}
              onClick={() => create.execute({ studyId, code: code.trim() || null, exams: [{ index: 1, date: examDate, timeLabel: examLabel }] })}
            >
              {t('createCase')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
