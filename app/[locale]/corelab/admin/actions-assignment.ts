'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { corelabAdminAction } from '@/lib/corelab/guards'
import {
  clearDraft, saveDraftAssignments, setReviewer, validateAndSendAssignments,
} from '@/lib/services/corelab/assignments'

async function revalidateAssignments(studyId: string) {
  for (const path of [`/corelab/admin/studies/${studyId}/patients`, `/corelab/studies/${studyId}/readings`, '/corelab', '/dashboard']) {
    revalidatePath(`/en${path}`)
    revalidatePath(`/fr${path}`)
  }
}

const DraftSchema = z.object({
  patientId: z.string(),
  readingMode: z.enum(['SINGLE', 'DOUBLE']),
  reader1: z.string().optional().nullable(),
  reader2: z.string().optional().nullable(),
  reviewer: z.string().optional().nullable(),
})

export const saveDraftAssignmentsAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), drafts: z.array(DraftSchema).min(1) }))
  .action(async ({ parsedInput }) => {
    await saveDraftAssignments(parsedInput.drafts)
    await revalidateAssignments(parsedInput.studyId)
    return { ok: true }
  })

export const clearDraftAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), patientId: z.string() }))
  .action(async ({ parsedInput }) => {
    await clearDraft(parsedInput.patientId)
    await revalidateAssignments(parsedInput.studyId)
    return { ok: true }
  })

export const setReviewerAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), patientId: z.string(), userId: z.string().nullable() }))
  .action(async ({ parsedInput }) => {
    await setReviewer(parsedInput.patientId, parsedInput.userId)
    await revalidateAssignments(parsedInput.studyId)
    return { ok: true }
  })

export const validateAssignmentsAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), dueDates: z.record(z.string(), z.string()) }))
  .action(async ({ parsedInput }) => {
    const requestHeaders = await headers()
    const host = requestHeaders.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const result = await validateAndSendAssignments(parsedInput.studyId, parsedInput.dueDates, `${protocol}://${host}`)
    await revalidateAssignments(parsedInput.studyId)
    return result
  })
