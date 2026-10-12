'use server'

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { appAdminAction } from '@/actions/safe-action'
import { ARTICLE_SCOPES } from '@/lib/publications/article-scope'
import { PUBLICATIONS_ARTICLES_TAG } from '@/lib/services/publications/import'
import { PUBLICATIONS_MAIL_SUGGESTIONS_TAG } from '@/lib/services/publications/mail-suggestions'
import {
  applySuggestion,
  createArticleFromSuggestion,
  dismissSuggestion,
} from '@/lib/services/publications/mail-suggestion-apply'

function revalidateSuggestions(): void {
  revalidateTag(PUBLICATIONS_MAIL_SUGGESTIONS_TAG)
  revalidateTag(PUBLICATIONS_ARTICLES_TAG)
}

export const applyMailSuggestionAction = appAdminAction('PUBLICATIONS')
  .inputSchema(
    z.object({
      suggestionId: z.string().min(1),
      articleId: z.string().min(1),
      journalName: z.string().trim().min(1).max(200),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const applied = await applySuggestion({ ...parsedInput, adminId: ctx.userId })
    revalidateSuggestions()
    return applied
  })

export const createArticleFromMailSuggestionAction = appAdminAction('PUBLICATIONS')
  .inputSchema(
    z.object({
      suggestionId: z.string().min(1),
      journalName: z.string().trim().min(1).max(200),
      scope: z.enum(ARTICLE_SCOPES),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const created = await createArticleFromSuggestion({ ...parsedInput, adminId: ctx.userId })
    revalidateSuggestions()
    return created
  })

export const dismissMailSuggestionAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ suggestionId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const dismissed = await dismissSuggestion(parsedInput.suggestionId, ctx.userId)
    revalidateSuggestions()
    return dismissed
  })
