'use client'

import { useFieldArray, useForm } from 'react-hook-form'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { updateThresholdsAction } from '../../actions'
import type { DiscordanceThreshold } from '@/lib/corelab/crf/schema'

type ThresholdRow = { fieldId: string; label: string; sequence: string; minorPercent: number; majorPercent: number }

type ThresholdsFormProps = {
  studyId: string
  crfVersionId: string
  rows: ThresholdRow[]
}

export function ThresholdsForm({ studyId, crfVersionId, rows }: ThresholdsFormProps) {
  const t = useTranslations('corelab.config')
  const router = useRouter()
  const form = useForm<{ thresholds: ThresholdRow[] }>({ defaultValues: { thresholds: rows } })
  const { fields } = useFieldArray({ control: form.control, name: 'thresholds' })

  const action = useAction(updateThresholdsAction, {
    onSuccess: () => {
      toast.success(t('thresholdsSaved'))
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  if (rows.length === 0) {
    return <p className="text-sm text-text-secondary">{t('thresholdsEmpty')}</p>
  }

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        const thresholds: DiscordanceThreshold[] = values.thresholds.map((row) => ({
          fieldId: row.fieldId,
          minorPercent: Number(row.minorPercent),
          majorPercent: Number(row.majorPercent),
        }))
        action.execute({ studyId, crfVersionId, thresholds })
      })}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('variable')}</TableHead>
              <TableHead>{t('sequence')}</TableHead>
              <TableHead className="w-32">{t('minor')}</TableHead>
              <TableHead className="w-32">{t('major')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell className="font-medium text-text-primary">{field.label}</TableCell>
                <TableCell className="text-text-secondary">{field.sequence}</TableCell>
                <TableCell>
                  <Input type="number" step="0.1" min={0} {...form.register(`thresholds.${index}.minorPercent`)} />
                </TableCell>
                <TableCell>
                  <Input type="number" step="0.1" min={0} {...form.register(`thresholds.${index}.majorPercent`)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button type="submit" className="mt-4" disabled={action.isPending}>{t('saveThresholds')}</Button>
    </form>
  )
}
