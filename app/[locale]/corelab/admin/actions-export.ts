'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { corelabAdminAction } from '@/lib/corelab/guards'
import { buildExport, exportDownloadUrl, previewExport } from '@/lib/services/corelab/exports'

const KindSchema = z.enum(['READINGS_LONG', 'READINGS_WIDE', 'REVIEW_DECISIONS', 'CALIBRATION', 'FULL_ARCHIVE'])

export const previewExportAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), kind: KindSchema }))
  .action(async ({ parsedInput }) => previewExport(parsedInput.studyId, parsedInput.kind))

export const exportStudyAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), kind: KindSchema }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await buildExport(parsedInput.studyId, parsedInput.kind, ctx.userId)
    revalidatePath(`/en/corelab/admin/studies/${parsedInput.studyId}/export`)
    revalidatePath(`/fr/corelab/admin/studies/${parsedInput.studyId}/export`)
    return result
  })

export const exportDownloadUrlAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), exportId: z.string() }))
  .action(async ({ parsedInput }) => ({ url: await exportDownloadUrl(parsedInput.exportId) }))
