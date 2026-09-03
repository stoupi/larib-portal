'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { corelabAdminAction } from '@/lib/corelab/guards'
import { commitCohortImport, previewCohortImport } from '@/lib/services/corelab/cohort'

export const previewCohortImportAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), fileKey: z.string().min(1), fileName: z.string().min(1) }))
  .action(async ({ parsedInput }) => previewCohortImport(parsedInput.studyId, parsedInput.fileKey, parsedInput.fileName))

export const commitCohortImportAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), fileKey: z.string().min(1), fileName: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await commitCohortImport(parsedInput.studyId, parsedInput.fileKey, parsedInput.fileName, ctx.userId)
    for (const path of [`/corelab/admin/studies/${parsedInput.studyId}/patients`, `/corelab/admin/studies/${parsedInput.studyId}/cohort/import`]) {
      revalidatePath(`/en${path}`)
      revalidatePath(`/fr${path}`)
    }
    return result
  })
