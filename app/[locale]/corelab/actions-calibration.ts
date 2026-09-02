'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { corelabStudyAction, signOrThrow } from '@/lib/corelab/guards'
import { snapshotHash } from '@/lib/corelab/snapshot-hash'
import {
  recordCalibrationDecision, refreshCalibrationStatus, saveCalibrationValues,
  saveGoldStandardValues, signGoldStandard, submitCalibrationCase,
} from '@/lib/services/corelab/calibration'
import { getCurrentCrfVersion } from '@/lib/services/corelab/studies'
import type { ExamValues, ReadingValues } from '@/types/corelab'

async function revalidateCalibration(studyId: string) {
  const paths = [
    `/corelab/admin/studies/${studyId}/calibration`,
    `/corelab/studies/${studyId}/calibration`,
    `/corelab/studies/${studyId}`,
    '/corelab',
  ]
  for (const path of paths) {
    revalidatePath(`/en${path}`)
    revalidatePath(`/fr${path}`)
  }
}

const ValuesSchema = z.record(z.string(), z.record(z.string(), z.unknown()))

async function assertDesignatedAuthor(caseId: string, userId: string, isDataManager: boolean) {
  const calibrationCase = await prisma.corelabCalibrationCase.findUniqueOrThrow({
    where: { id: caseId },
    select: { goldStandardUserId: true },
  })
  if (isDataManager) return
  if (calibrationCase.goldStandardUserId !== userId) throw new Error('NOT_THE_REFERENCE_AUTHOR')
}

export const saveGoldStandardAction = corelabStudyAction(['AUTHOR_REFERENCE'])
  .inputSchema(z.object({ studyId: z.string(), caseId: z.string(), examId: z.string(), values: ValuesSchema }))
  .action(async ({ parsedInput, ctx }) => {
    await assertDesignatedAuthor(parsedInput.caseId, ctx.userId, ctx.studyAccess.isDataManager)
    const calibrationCase = await prisma.corelabCalibrationCase.findUniqueOrThrow({
      where: { id: parsedInput.caseId },
      select: { goldStandard: true },
    })
    const current = (calibrationCase.goldStandard ?? {}) as ReadingValues
    await saveGoldStandardValues(parsedInput.caseId, {
      ...current,
      [parsedInput.examId]: parsedInput.values as ExamValues,
    })
    return { ok: true }
  })

export const signGoldStandardAction = corelabStudyAction(['AUTHOR_REFERENCE'])
  .inputSchema(z.object({ studyId: z.string(), caseId: z.string(), password: z.string().min(1), reason: z.string().trim().min(3) }))
  .action(async ({ parsedInput, ctx }) => {
    await assertDesignatedAuthor(parsedInput.caseId, ctx.userId, ctx.studyAccess.isDataManager)
    const calibrationCase = await prisma.corelabCalibrationCase.findUniqueOrThrow({
      where: { id: parsedInput.caseId },
      select: { goldStandard: true, goldStandardSignatureId: true },
    })
    if (calibrationCase.goldStandardSignatureId) throw new Error('GOLD_STANDARD_SIGNED')
    const crfVersion = await getCurrentCrfVersion(parsedInput.studyId)

    await prisma.$transaction(async (transaction) => {
      const signature = await signOrThrow(
        ctx.session,
        parsedInput,
        {
          role: ctx.studyAccess.isDataManager ? 'DATA_MANAGER' : 'REFERENCE_AUTHOR',
          entityType: 'gold_standard',
          entityId: parsedInput.caseId,
          studyId: parsedInput.studyId,
          crfVersionId: crfVersion?.id ?? null,
          snapshotHash: snapshotHash(calibrationCase.goldStandard),
        },
        transaction,
      )
      await signGoldStandard(parsedInput.caseId, signature.id, transaction)
    })
    await revalidateCalibration(parsedInput.studyId)
    return { ok: true }
  })

export const saveCalibrationValuesAction = corelabStudyAction(['READ'])
  .inputSchema(z.object({ studyId: z.string(), assignmentId: z.string(), examId: z.string(), values: ValuesSchema }))
  .action(async ({ parsedInput, ctx }) => {
    await saveCalibrationValues(parsedInput.assignmentId, ctx.userId, parsedInput.values as ExamValues, parsedInput.examId)
    return { ok: true }
  })

export const submitCalibrationCaseAction = corelabStudyAction(['READ'])
  .inputSchema(z.object({ studyId: z.string(), assignmentId: z.string(), password: z.string().min(1), reason: z.string().trim().min(3) }))
  .action(async ({ parsedInput, ctx }) => {
    const assignment = await prisma.corelabCalibrationAssignment.findUniqueOrThrow({
      where: { id: parsedInput.assignmentId },
      select: { values: true, caseId: true },
    })
    const crfVersion = await getCurrentCrfVersion(parsedInput.studyId)

    await prisma.$transaction(async (transaction) => {
      const signature = await signOrThrow(
        ctx.session,
        parsedInput,
        {
          role: 'READER',
          entityType: 'calibration_submission',
          entityId: parsedInput.assignmentId,
          studyId: parsedInput.studyId,
          crfVersionId: crfVersion?.id ?? null,
          snapshotHash: snapshotHash(assignment.values),
        },
        transaction,
      )
      await submitCalibrationCase(parsedInput.assignmentId, ctx.userId, signature.id, transaction)
    })
    await refreshCalibrationStatus(parsedInput.studyId, ctx.userId)
    await revalidateCalibration(parsedInput.studyId)
    return { ok: true }
  })

export const decideCalibrationAction = corelabStudyAction(['CERTIFY'])
  .inputSchema(z.object({
    studyId: z.string(),
    userId: z.string(),
    decision: z.enum(['CERTIFY', 'ADDITIONAL_CASES', 'FAIL']),
    comments: z.record(z.string(), z.string()),
    password: z.string().min(1),
    reason: z.string().trim().min(3),
  }))
  .action(async ({ parsedInput, ctx }) => {
    await prisma.$transaction(async (transaction) => {
      const signature = await signOrThrow(
        ctx.session,
        parsedInput,
        {
          role: ctx.studyAccess.isDataManager ? 'DATA_MANAGER' : 'CERTIFIER',
          entityType: 'calibration_review',
          entityId: parsedInput.userId,
          studyId: parsedInput.studyId,
          snapshotHash: snapshotHash(parsedInput.comments),
        },
        transaction,
      )
      await recordCalibrationDecision(
        {
          studyId: parsedInput.studyId,
          userId: parsedInput.userId,
          reviewerId: ctx.userId,
          decision: parsedInput.decision,
          comments: parsedInput.comments,
          signatureId: signature.id,
        },
        transaction,
      )
    })
    await revalidateCalibration(parsedInput.studyId)
    return { ok: true }
  })
