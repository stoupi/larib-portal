'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { corelabMemberAction, signOrThrow } from '@/lib/corelab/guards'
import {
  importFromWorkbook, notifyReviewerIfReady, saveValues, setSequenceFlag, submitReading,
} from '@/lib/services/corelab/readings'
import { deleteDocument, registerUpload } from '@/lib/services/corelab/documents'
import { resolveReturn } from '@/lib/services/corelab/document-returns'

async function revalidateReading(assignmentId: string, studyId: string) {
  for (const path of [`/corelab/reading/${assignmentId}`, `/corelab/studies/${studyId}/readings`, '/corelab', '/dashboard']) {
    revalidatePath(`/en${path}`)
    revalidatePath(`/fr${path}`)
  }
}

async function studyOf(assignmentId: string): Promise<string> {
  const assignment = await prisma.corelabReadingAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    select: { patient: { select: { studyId: true } } },
  })
  return assignment.patient.studyId
}

const FieldValueSchema = z.object({
  value: z.unknown().optional(),
  source: z.enum(['MANUAL', 'IMPORTED', 'MODIFIED']),
  flag: z.enum(['UNCERTAIN_VALUE', 'POOR_IMAGE_QUALITY', 'MEASUREMENT_DIFFICULT', 'OTHER']).nullable().optional(),
  flagNote: z.string().nullable().optional(),
})

export const saveReadingValuesAction = corelabMemberAction
  .inputSchema(z.object({
    assignmentId: z.string(),
    changes: z.array(z.object({
      examId: z.string(),
      sequenceId: z.string(),
      fieldId: z.string(),
      value: FieldValueSchema.nullable(),
    })).min(1),
  }))
  .action(async ({ parsedInput, ctx }) => {
    await saveValues(
      parsedInput.assignmentId,
      ctx.userId,
      parsedInput.changes.map((change) => ({
        ...change,
        value: change.value
          ? {
              value: change.value.value ?? null,
              source: change.value.source,
              flag: change.value.flag ?? null,
              flagNote: change.value.flagNote ?? null,
            }
          : null,
      })),
    )
    return { ok: true }
  })

export const setSequenceFlagAction = corelabMemberAction
  .inputSchema(z.object({
    assignmentId: z.string(),
    examId: z.string(),
    sequenceId: z.string(),
    flag: z.object({
      category: z.enum(['NOT_ANALYZABLE', 'ARTEFACTS_SEVERE', 'SOFTWARE_ERROR', 'OTHER']),
      note: z.string().trim(),
    }).nullable(),
  }))
  .action(async ({ parsedInput, ctx }) => {
    await setSequenceFlag(parsedInput.assignmentId, ctx.userId, parsedInput.examId, parsedInput.sequenceId, parsedInput.flag)
    return { ok: true }
  })

export const registerReadingDocumentAction = corelabMemberAction
  .inputSchema(z.object({
    assignmentId: z.string(),
    examId: z.string().nullable(),
    slotKey: z.string(),
    key: z.string(),
    fileName: z.string(),
    mimeType: z.string(),
    size: z.number().int().positive(),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const studyId = await studyOf(parsedInput.assignmentId)
    const document = await registerUpload({
      assignmentId: parsedInput.assignmentId,
      examId: parsedInput.examId,
      slotKey: parsedInput.slotKey,
      fileName: parsedInput.fileName,
      fileKey: parsedInput.key,
      mimeType: parsedInput.mimeType,
      fileSize: parsedInput.size,
      uploadedById: ctx.userId,
      studyId,
    })
    await revalidateReading(parsedInput.assignmentId, studyId)
    return document
  })

export const deleteReadingDocumentAction = corelabMemberAction
  .inputSchema(z.object({ assignmentId: z.string(), documentId: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    await deleteDocument(parsedInput.documentId, ctx.userId)
    await revalidateReading(parsedInput.assignmentId, await studyOf(parsedInput.assignmentId))
    return { ok: true }
  })

export const importWorkbookAction = corelabMemberAction
  .inputSchema(z.object({ assignmentId: z.string(), documentId: z.string(), examId: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const report = await importFromWorkbook(parsedInput.assignmentId, ctx.userId, parsedInput.documentId, parsedInput.examId)
    await revalidateReading(parsedInput.assignmentId, await studyOf(parsedInput.assignmentId))
    return report
  })

export const submitReadingAction = corelabMemberAction
  .inputSchema(z.object({ assignmentId: z.string(), password: z.string().min(1), reason: z.string().trim().min(3) }))
  .action(async ({ parsedInput, ctx }) => {
    const assignment = await prisma.corelabReadingAssignment.findUniqueOrThrow({
      where: { id: parsedInput.assignmentId },
      select: { crfVersionId: true, patient: { select: { id: true, studyId: true } } },
    })

    await prisma.$transaction(async (transaction) => {
      const signature = await signOrThrow(
        ctx.session,
        parsedInput,
        {
          role: 'READER',
          entityType: 'reading_submission',
          entityId: parsedInput.assignmentId,
          studyId: assignment.patient.studyId,
          crfVersionId: assignment.crfVersionId,
        },
        transaction,
      )
      await submitReading(parsedInput.assignmentId, ctx.userId, signature.id, transaction)
    })

    const requestHeaders = await headers()
    const host = requestHeaders.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    await notifyReviewerIfReady(assignment.patient.id, `${protocol}://${host}`)
    await revalidateReading(parsedInput.assignmentId, assignment.patient.studyId)
    return { ok: true }
  })

export const resolveDocumentReturnAction = corelabMemberAction
  .inputSchema(z.object({ assignmentId: z.string(), returnId: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await resolveReturn(parsedInput.returnId, ctx.userId)
    await revalidateReading(parsedInput.assignmentId, await studyOf(parsedInput.assignmentId))
    return result
  })
