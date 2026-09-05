'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { corelabAdminAction } from '@/lib/corelab/guards'
import { saveBlock, saveValueSet, saveVariable } from '@/lib/services/corelab/library'
import { discardDraft, publishDraft, saveDraft, startDraft } from '@/lib/services/corelab/crf-editor'

const MODALITY = z.enum(['CMR', 'CT', 'PET', 'ECHO'])

async function revalidateLibrary(studyId?: string) {
  const paths = ['/corelab/admin/library', ...(studyId ? [`/corelab/admin/studies/${studyId}/crf`, `/corelab/admin/studies/${studyId}`] : [])]
  for (const path of paths) {
    revalidatePath(`/en${path}`)
    revalidatePath(`/fr${path}`)
  }
}

export const saveValueSetAction = corelabAdminAction
  .inputSchema(z.object({
    valueSetId: z.string().optional(),
    code: z.string().trim().min(2).regex(/^[a-z0-9_]+$/),
    name: z.string().trim().min(2),
    modality: MODALITY,
    description: z.string().trim().default(''),
    items: z.array(z.object({
      code: z.string().trim().min(1),
      label: z.string().trim().min(1),
      colour: z.string().trim().optional().nullable(),
      order: z.number().int().min(0),
    })).min(1),
  }))
  .action(async ({ parsedInput }) => {
    const { valueSetId, ...input } = parsedInput
    const saved = await saveValueSet(input, valueSetId)
    await revalidateLibrary()
    return saved
  })

export const saveVariableAction = corelabAdminAction
  .inputSchema(z.object({
    variableId: z.string().optional(),
    code: z.string().trim().min(2).regex(/^[a-z0-9_]+$/),
    name: z.string().trim().min(2),
    modality: MODALITY,
    type: z.enum(['numeric', 'boolean', 'categorical', 'text', 'segment_categorical', 'segment_numeric', 'series_availability']),
    params: z.record(z.string(), z.unknown()).default({}),
    valueSetId: z.string().nullable().default(null),
  }))
  .action(async ({ parsedInput }) => {
    const { variableId, ...input } = parsedInput
    const saved = await saveVariable(input, variableId)
    await revalidateLibrary()
    return saved
  })

export const saveBlockAction = corelabAdminAction
  .inputSchema(z.object({
    blockId: z.string().optional(),
    code: z.string().trim().min(2).regex(/^[a-z0-9_]+$/),
    name: z.string().trim().min(2),
    kind: z.enum(['SECTION', 'SEQUENCE']),
    modality: MODALITY,
    definition: z.unknown(),
  }))
  .action(async ({ parsedInput }) => {
    const { blockId, definition, ...input } = parsedInput
    const saved = await saveBlock({ ...input, definition }, blockId)
    await revalidateLibrary()
    return saved
  })

export const startDraftAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const draft = await startDraft(parsedInput.studyId, ctx.userId)
    await revalidateLibrary(parsedInput.studyId)
    return draft
  })

export const saveDraftAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), definition: z.unknown() }))
  .action(async ({ parsedInput }) => {
    await saveDraft(parsedInput.studyId, parsedInput.definition)
    await revalidateLibrary(parsedInput.studyId)
    return { ok: true }
  })

export const publishDraftAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const published = await publishDraft(parsedInput.studyId, ctx.userId)
    await revalidateLibrary(parsedInput.studyId)
    return published
  })

export const discardDraftAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string() }))
  .action(async ({ parsedInput }) => {
    await discardDraft(parsedInput.studyId)
    await revalidateLibrary(parsedInput.studyId)
    return { ok: true }
  })
