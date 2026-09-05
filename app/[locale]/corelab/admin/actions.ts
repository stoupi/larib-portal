'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { corelabAdminAction, signOrThrow } from '@/lib/corelab/guards'
import { allowedNextPhases } from '@/lib/corelab/study-phase'
import { discordanceThresholdsSchema } from '@/lib/corelab/crf/schema'
import { createStudy, updateStudyInfo, updateDiscordanceThresholds, setStudyPhase } from '@/lib/services/corelab/studies'
import { buildExport } from '@/lib/services/corelab/exports'
import { addMember, updateMember, removeMember } from '@/lib/services/corelab/memberships'
import { addStudyDocument, documentDownloadUrl } from '@/lib/services/corelab/documents'

async function revalidateCorelab(studyId?: string) {
  const paths = [
    '/corelab',
    '/corelab/admin',
    '/corelab/admin/studies',
    ...(studyId ? [`/corelab/admin/studies/${studyId}`, `/corelab/admin/studies/${studyId}/team`] : []),
  ]
  for (const path of paths) {
    revalidatePath(`/en${path}`)
    revalidatePath(`/fr${path}`)
  }
}

function parseDueDate(value: string | null | undefined): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null
}

export const createStudyAction = corelabAdminAction
  .inputSchema(z.object({
    code: z.string().trim().min(2).max(50).regex(/^[A-Z0-9-]+$/),
    name: z.string().trim().min(2),
    description: z.string().trim().default(''),
    maxExamsPerPatient: z.number().int().min(1).max(6),
    reviewDeadlineDays: z.number().int().min(1).max(90),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const study = await createStudy({ ...parsedInput, createdById: ctx.userId })
    await revalidateCorelab()
    return study
  })

export const updateStudyInfoAction = corelabAdminAction
  .inputSchema(z.object({
    studyId: z.string(),
    name: z.string().trim().min(2),
    description: z.string().trim(),
    reviewDeadlineDays: z.number().int().min(1).max(90),
    maxExamsPerPatient: z.number().int().min(1).max(6),
  }))
  .action(async ({ parsedInput }) => {
    const { studyId, ...info } = parsedInput
    await updateStudyInfo(studyId, info)
    await revalidateCorelab(studyId)
    return { ok: true }
  })

export const updateThresholdsAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), crfVersionId: z.string(), thresholds: discordanceThresholdsSchema }))
  .action(async ({ parsedInput }) => {
    await updateDiscordanceThresholds(parsedInput.crfVersionId, parsedInput.thresholds)
    await revalidateCorelab(parsedInput.studyId)
    return { ok: true }
  })

export const changeStudyPhaseAction = corelabAdminAction
  .inputSchema(z.object({
    studyId: z.string(),
    phase: z.enum(['RUN_IN', 'PRODUCTION', 'CLOSED']),
    password: z.string().min(1),
    reason: z.string().trim().min(3),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const study = await prisma.corelabStudy.findUniqueOrThrow({
      where: { id: parsedInput.studyId },
      select: { phase: true },
    })
    if (!allowedNextPhases(study.phase).includes(parsedInput.phase)) throw new Error('PHASE_TRANSITION_NOT_ALLOWED')

    if (parsedInput.phase === 'CLOSED') {
      const unfinished = await prisma.corelabPatient.count({
        where: { studyId: parsedInput.studyId, status: { notIn: ['COMPLETED', 'FORCE_CLOSED'] } },
      })
      if (unfinished > 0) throw new Error('PATIENTS_STILL_OPEN')
    }
    await prisma.$transaction(async (transaction) => {
      await signOrThrow(
        ctx.session,
        parsedInput,
        {
          role: 'DATA_MANAGER',
          entityType: 'study_phase',
          entityId: parsedInput.studyId,
          studyId: parsedInput.studyId,
        },
        transaction,
      )
      await setStudyPhase(parsedInput.studyId, parsedInput.phase, transaction)
    })
    if (parsedInput.phase === 'CLOSED') {
      await buildExport(parsedInput.studyId, 'FULL_ARCHIVE', ctx.userId)
    }
    await revalidateCorelab(parsedInput.studyId)
    return { ok: true }
  })

export const addMemberAction = corelabAdminAction
  .inputSchema(z.object({
    studyId: z.string(),
    userId: z.string(),
    canRead: z.boolean(),
    canAdjudicate: z.boolean(),
    canAuthorReference: z.boolean(),
    canCertify: z.boolean(),
    trainingDueAt: z.string().optional().nullable(),
    calibrationDueAt: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const membership = await addMember({
      studyId: parsedInput.studyId,
      userId: parsedInput.userId,
      canRead: parsedInput.canRead,
      canAdjudicate: parsedInput.canAdjudicate,
      canAuthorReference: parsedInput.canAuthorReference,
      canCertify: parsedInput.canCertify,
      addedById: ctx.userId,
      trainingDueAt: parseDueDate(parsedInput.trainingDueAt),
      calibrationDueAt: parseDueDate(parsedInput.calibrationDueAt),
    })
    await revalidateCorelab(parsedInput.studyId)
    return membership
  })

export const updateMemberAction = corelabAdminAction
  .inputSchema(z.object({
    studyId: z.string(),
    membershipId: z.string(),
    canRead: z.boolean().optional(),
    canAdjudicate: z.boolean().optional(),
    canAuthorReference: z.boolean().optional(),
    canCertify: z.boolean().optional(),
    trainingDueAt: z.string().optional().nullable(),
    calibrationDueAt: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    await updateMember(parsedInput.membershipId, {
      canRead: parsedInput.canRead,
      canAdjudicate: parsedInput.canAdjudicate,
      canAuthorReference: parsedInput.canAuthorReference,
      canCertify: parsedInput.canCertify,
      trainingDueAt: parseDueDate(parsedInput.trainingDueAt),
      calibrationDueAt: parseDueDate(parsedInput.calibrationDueAt),
    })
    await revalidateCorelab(parsedInput.studyId)
    return { ok: true }
  })

export const removeMemberAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), membershipId: z.string() }))
  .action(async ({ parsedInput }) => {
    await removeMember(parsedInput.membershipId)
    await revalidateCorelab(parsedInput.studyId)
    return { ok: true }
  })

export const addStudyDocumentAction = corelabAdminAction
  .inputSchema(z.object({
    studyId: z.string(),
    title: z.string().trim().min(2),
    key: z.string().min(1),
    fileName: z.string().min(1),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const created = await addStudyDocument({
      studyId: parsedInput.studyId,
      title: parsedInput.title,
      fileKey: parsedInput.key,
      fileName: parsedInput.fileName,
      uploadedById: ctx.userId,
    })
    for (const locale of ['en', 'fr']) {
      revalidatePath(`/${locale}/corelab/studies/${parsedInput.studyId}/documents`)
      revalidatePath(`/${locale}/corelab/admin/studies/${parsedInput.studyId}/documents`)
    }
    return created
  })

export const readingDocumentUrlAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), documentId: z.string() }))
  .action(async ({ parsedInput }) => {
    return { url: await documentDownloadUrl(parsedInput.documentId) }
  })
