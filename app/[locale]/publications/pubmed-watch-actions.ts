'use server'

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { appAdminAction } from '@/actions/safe-action'
import { PUBLICATIONS_ARTICLES_TAG } from '@/lib/services/publications/import'
import {
  PUBLICATIONS_PUBMED_ALERTS_TAG,
  dismissPubmedAlert,
  importPubmedAlert,
  linkPubmedAlert,
} from '@/lib/services/publications/pubmed-watch'

function revalidateAlerts(): void {
  revalidateTag(PUBLICATIONS_PUBMED_ALERTS_TAG)
  revalidateTag(PUBLICATIONS_ARTICLES_TAG)
}

export const linkPubmedAlertAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ alertId: z.string().min(1), articleId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const linked = await linkPubmedAlert({ ...parsedInput, adminId: ctx.userId })
    revalidateAlerts()
    return linked
  })

export const importPubmedAlertAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ alertId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const imported = await importPubmedAlert({ alertId: parsedInput.alertId, adminId: ctx.userId })
    revalidateAlerts()
    return imported
  })

export const dismissPubmedAlertAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ alertId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const dismissed = await dismissPubmedAlert(parsedInput.alertId, ctx.userId)
    revalidateAlerts()
    return dismissed
  })
