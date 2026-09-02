'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { corelabAdminAction } from '@/lib/corelab/guards'
import { quizSchema } from '@/lib/corelab/training/quiz-schema'
import { isAcceptedVideo } from '@/lib/corelab/training/video'
import {
  archiveModule, createModule, setModuleVideo, setStudyRequirements, updateModule,
} from '@/lib/services/corelab/training'

async function revalidateTraining(studyId?: string) {
  const paths = [
    '/corelab/training',
    '/corelab/admin/training',
    ...(studyId ? [`/corelab/admin/studies/${studyId}/training`, `/corelab/studies/${studyId}/training`] : []),
  ]
  for (const path of paths) {
    revalidatePath(`/en${path}`)
    revalidatePath(`/fr${path}`)
  }
}

const ModuleSchema = z.object({
  scope: z.enum(['CORE', 'SOFTWARE', 'STUDY']),
  softwareName: z.string().trim().optional().nullable(),
  studyId: z.string().optional().nullable(),
  order: z.number().int().min(0).max(99),
  title: z.string().trim().min(2),
  description: z.string().trim(),
  type: z.enum(['VIDEO', 'QUIZ']),
  durationMinutes: z.number().int().min(0).max(600),
  passThreshold: z.number().int().min(1).max(100).optional().nullable(),
  quiz: quizSchema.optional().nullable(),
})

export const createModuleAction = corelabAdminAction
  .inputSchema(ModuleSchema)
  .action(async ({ parsedInput }) => {
    const created = await createModule({
      ...parsedInput,
      softwareName: parsedInput.softwareName ?? null,
      studyId: parsedInput.scope === 'STUDY' ? parsedInput.studyId ?? null : null,
      passThreshold: parsedInput.passThreshold ?? null,
      quiz: parsedInput.quiz ?? null,
    })
    await revalidateTraining(parsedInput.studyId ?? undefined)
    return created
  })

export const updateModuleAction = corelabAdminAction
  .inputSchema(ModuleSchema.partial().extend({ moduleId: z.string() }))
  .action(async ({ parsedInput }) => {
    const { moduleId, ...input } = parsedInput
    await updateModule(moduleId, {
      ...input,
      softwareName: input.softwareName ?? null,
      passThreshold: input.passThreshold ?? null,
      quiz: input.quiz ?? null,
    })
    await revalidateTraining(input.studyId ?? undefined)
    return { ok: true }
  })

export const setModuleVideoAction = corelabAdminAction
  .inputSchema(z.object({ moduleId: z.string(), key: z.string().min(1), mimeType: z.string(), size: z.number().int().positive() }))
  .action(async ({ parsedInput }) => {
    if (!isAcceptedVideo(parsedInput.mimeType, parsedInput.size)) throw new Error('UNSUPPORTED_VIDEO')
    await setModuleVideo(parsedInput.moduleId, {
      key: parsedInput.key,
      mimeType: parsedInput.mimeType,
      size: parsedInput.size,
    })
    await revalidateTraining()
    return { ok: true }
  })

export const archiveModuleAction = corelabAdminAction
  .inputSchema(z.object({ moduleId: z.string() }))
  .action(async ({ parsedInput }) => {
    await archiveModule(parsedInput.moduleId)
    await revalidateTraining()
    return { ok: true }
  })

export const setStudyRequirementsAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), moduleIds: z.array(z.string()) }))
  .action(async ({ parsedInput }) => {
    await setStudyRequirements(parsedInput.studyId, parsedInput.moduleIds)
    await revalidateTraining(parsedInput.studyId)
    return { ok: true }
  })
