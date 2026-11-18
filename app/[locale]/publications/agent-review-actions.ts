'use server'

import { z } from 'zod'
import { appAdminAction } from '@/actions/safe-action'
import { markAgentChangesReviewed } from '@/lib/services/publications/agent-review'

export const markAgentChangesReviewedAction = appAdminAction('PUBLICATIONS')
  .inputSchema(
    z.object({
      reviews: z
        .array(z.object({ articleId: z.string().min(1), reviewedUpTo: z.coerce.date() }))
        .min(1)
        .max(500),
    }),
  )
  .action(async ({ parsedInput, ctx }) => markAgentChangesReviewed({ reviews: parsedInput.reviews, adminId: ctx.userId }))
