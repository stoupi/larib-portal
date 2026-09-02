'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { corelabStudyAction } from '@/lib/corelab/guards'
import { parseCalibrationCasesCsv } from '@/lib/corelab/calibration/cases-csv'
import { assignCases, createCase, importCases } from '@/lib/services/corelab/calibration'

async function revalidateCalibration(studyId: string) {
  const paths = [
    `/corelab/admin/studies/${studyId}/calibration`,
    `/corelab/studies/${studyId}/calibration`,
    `/corelab/studies/${studyId}`,
  ]
  for (const path of paths) {
    revalidatePath(`/en${path}`)
    revalidatePath(`/fr${path}`)
  }
}

const ExamSchema = z.object({
  index: z.number().int().min(1).max(6),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeLabel: z.string().trim(),
})

export const createCaseAction = corelabStudyAction(['DATA_MANAGER', 'PI'])
  .inputSchema(z.object({ studyId: z.string(), code: z.string().trim().optional().nullable(), exams: z.array(ExamSchema).min(1) }))
  .action(async ({ parsedInput }) => {
    const created = await createCase(parsedInput.studyId, { code: parsedInput.code, exams: parsedInput.exams })
    await revalidateCalibration(parsedInput.studyId)
    return created
  })

export const importCasesAction = corelabStudyAction(['DATA_MANAGER', 'PI'])
  .inputSchema(z.object({ studyId: z.string(), content: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const parsed = parseCalibrationCasesCsv(parsedInput.content)
    if (parsed.errors.length > 0) return { ok: false as const, errors: parsed.errors }
    const result = await importCases(parsedInput.studyId, parsed.cases)
    await revalidateCalibration(parsedInput.studyId)
    return { ok: true as const, created: result.created }
  })

export const assignCasesAction = corelabStudyAction(['DATA_MANAGER', 'PI'])
  .inputSchema(z.object({ studyId: z.string(), caseIds: z.array(z.string()).min(1), userIds: z.array(z.string()).min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await assignCases(parsedInput.studyId, parsedInput.caseIds, parsedInput.userIds)
    await revalidateCalibration(parsedInput.studyId)
    return result
  })
