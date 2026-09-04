'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { corelabAdminAction } from '@/lib/corelab/guards'
import { returnForDocuments } from '@/lib/services/corelab/document-returns'

export const returnForDocumentsAction = corelabAdminAction
  .inputSchema(z.object({
    studyId: z.string(),
    patientId: z.string(),
    message: z.string().trim().min(3),
    slotKeys: z.array(z.string()).min(1),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const created = await returnForDocuments(parsedInput.patientId, ctx.userId, parsedInput.message, parsedInput.slotKeys)
    for (const path of [`/corelab/admin/studies/${parsedInput.studyId}/patients`, '/corelab']) {
      revalidatePath(`/en${path}`)
      revalidatePath(`/fr${path}`)
    }
    return created
  })
