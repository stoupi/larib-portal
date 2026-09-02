'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { corelabStudyAction } from '@/lib/corelab/guards'
import { completeVideoModule, submitQuiz, unlockCalibrationIfTrained } from '@/lib/services/corelab/training'

async function revalidateReaderTraining(studyId: string) {
  const paths = ['/corelab', '/corelab/training', `/corelab/studies/${studyId}`, `/corelab/studies/${studyId}/training`]
  for (const path of paths) {
    revalidatePath(`/en${path}`)
    revalidatePath(`/fr${path}`)
  }
}

export const completeVideoAction = corelabStudyAction([])
  .inputSchema(z.object({ studyId: z.string(), moduleId: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    await completeVideoModule(ctx.userId, parsedInput.moduleId)
    const unlocked = await unlockCalibrationIfTrained(parsedInput.studyId, ctx.userId)
    await revalidateReaderTraining(parsedInput.studyId)
    return { unlocked }
  })

export const submitQuizAction = corelabStudyAction([])
  .inputSchema(z.object({ studyId: z.string(), moduleId: z.string(), answers: z.record(z.string(), z.string()) }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await submitQuiz(ctx.userId, parsedInput.moduleId, parsedInput.answers)
    const unlocked = result.passed ? await unlockCalibrationIfTrained(parsedInput.studyId, ctx.userId) : false
    await revalidateReaderTraining(parsedInput.studyId)
    return { ...result, unlocked }
  })
