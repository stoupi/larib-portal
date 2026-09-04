'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { corelabMemberAction, signOrThrow } from '@/lib/corelab/guards'
import { snapshotHash } from '@/lib/corelab/snapshot-hash'
import { requestRework, saveDecisions, signReview, markReworkResubmitted } from '@/lib/services/corelab/reviews'
import { notifyReviewerIfReady, submitReading } from '@/lib/services/corelab/readings'

async function revalidateReview(patientId: string, studyId: string) {
  for (const path of [`/corelab/review/${patientId}`, `/corelab/studies/${studyId}/reviews`, `/corelab/studies/${studyId}/readings`, '/corelab']) {
    revalidatePath(`/en${path}`)
    revalidatePath(`/fr${path}`)
  }
}

async function studyOfPatient(patientId: string): Promise<string> {
  const patient = await prisma.corelabPatient.findUniqueOrThrow({ where: { id: patientId }, select: { studyId: true } })
  return patient.studyId
}

const DecisionSchema = z.object({
  examId: z.string(),
  sequenceId: z.string(),
  fieldId: z.string(),
  decision: z.enum(['AVERAGE', 'R1', 'R2', 'CUSTOM']),
  customValue: z.unknown().optional(),
})

export const saveDecisionsAction = corelabMemberAction
  .inputSchema(z.object({ patientId: z.string(), decisions: z.array(DecisionSchema).min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    await saveDecisions(parsedInput.patientId, ctx.userId, parsedInput.decisions)
    return { ok: true }
  })

export const requestReworkAction = corelabMemberAction
  .inputSchema(z.object({
    patientId: z.string(),
    items: z.array(z.object({
      readerAssignmentId: z.string(),
      sequenceId: z.string(),
      fieldIds: z.array(z.string()),
    })).min(1),
    comments: z.record(z.string(), z.string()),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const requestHeaders = await headers()
    const host = requestHeaders.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const created = await requestRework(
      parsedInput.patientId, ctx.userId, parsedInput.items, parsedInput.comments, `${protocol}://${host}`,
    )
    await revalidateReview(parsedInput.patientId, await studyOfPatient(parsedInput.patientId))
    return created
  })

export const signReviewAction = corelabMemberAction
  .inputSchema(z.object({ patientId: z.string(), password: z.string().min(1), reason: z.string().trim().min(3) }))
  .action(async ({ parsedInput, ctx }) => {
    const studyId = await studyOfPatient(parsedInput.patientId)
    const decisions = await prisma.corelabReviewDecision.findMany({
      where: { patientId: parsedInput.patientId },
      select: { examId: true, sequenceId: true, fieldId: true, decision: true, finalValue: true },
    })

    await prisma.$transaction(async (transaction) => {
      const signature = await signOrThrow(
        ctx.session,
        parsedInput,
        {
          role: 'REVIEWER',
          entityType: 'review_completion',
          entityId: parsedInput.patientId,
          studyId,
          snapshotHash: snapshotHash(decisions),
        },
        transaction,
      )
      await signReview(parsedInput.patientId, ctx.userId, signature.id, transaction)
    })
    await revalidateReview(parsedInput.patientId, studyId)
    return { ok: true }
  })

export const resubmitAfterReworkAction = corelabMemberAction
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

    await markReworkResubmitted(assignment.patient.id)
    const requestHeaders = await headers()
    const host = requestHeaders.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    await notifyReviewerIfReady(assignment.patient.id, `${protocol}://${host}`)
    await revalidateReview(assignment.patient.id, assignment.patient.studyId)
    return { ok: true }
  })
