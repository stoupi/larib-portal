import { prisma } from '@/lib/prisma'
import type { ArticleScope } from '@/app/generated/prisma'
import {
  findSubmission,
  manuscriptKeyOf,
  type CandidateArticle,
  type MailDecision,
  type MailEventKind,
} from '@/lib/publications/mail-agent'
import type { SubmissionStatusValue } from '@/lib/publications/status-display'
import type { ArticleStatusValue } from './articles'
import { addSubmission, updateSubmissionStatus } from './submissions'

export type MailEventChange = {
  kind: MailEventKind
  decision: MailDecision | null
  articleId: string
  journalName: string
  submissionId: string | null
  manuscriptNumber: string | null
  eventDate: Date
}

export async function applyMailEvent(change: MailEventChange): Promise<{ submissionId: string }> {
  const newSubmission = { articleId: change.articleId, journalName: change.journalName, submittedAt: change.eventDate }
  const submissionId =
    change.kind === 'DECISION' && change.submissionId ? change.submissionId : (await addSubmission(newSubmission)).id

  if (change.kind === 'DECISION' && change.decision) {
    await updateSubmissionStatus({ submissionId, status: change.decision, decidedAt: change.eventDate })
    if (change.decision === 'ACCEPTED') {
      await prisma.article.updateMany({
        where: { id: change.articleId, acceptedAt: null },
        data: { acceptedAt: change.eventDate },
      })
    }
  }

  const manuscriptKey = manuscriptKeyOf(change.manuscriptNumber)
  if (manuscriptKey) {
    await prisma.submission.updateMany({
      where: { id: submissionId, manuscriptNumber: null },
      data: { manuscriptNumber: manuscriptKey },
    })
  }
  return { submissionId }
}

export async function loadCandidateArticle(articleId: string): Promise<CandidateArticle | null> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      status: true,
      submissions: {
        select: {
          id: true,
          journalId: true,
          manuscriptNumber: true,
          status: true,
          submittedAt: true,
          journal: { select: { name: true } },
        },
      },
    },
  })
  if (!article) return null
  return {
    id: article.id,
    title: article.title,
    status: article.status as ArticleStatusValue,
    submissions: article.submissions.map((submission) => ({
      id: submission.id,
      journalId: submission.journalId,
      journalName: submission.journal.name,
      manuscriptNumber: submission.manuscriptNumber,
      status: submission.status as SubmissionStatusValue,
      submittedAt: submission.submittedAt,
    })),
  }
}

export type ApplySuggestionInput = {
  suggestionId: string
  articleId: string
  journalName: string
  adminId: string
}

export async function applySuggestion(input: ApplySuggestionInput): Promise<{ articleId: string }> {
  const suggestion = await prisma.publicationMailSuggestion.findUnique({ where: { id: input.suggestionId } })
  if (!suggestion || suggestion.status !== 'PENDING') throw new Error('SUGGESTION_NOT_PENDING')
  const article = await loadCandidateArticle(input.articleId)
  if (!article) throw new Error('ARTICLE_NOT_FOUND')

  const decision = suggestion.decision as MailDecision | null
  const knownSubmission =
    suggestion.kind === 'DECISION'
      ? findSubmission(
          {
            kind: suggestion.kind,
            decision,
            title: suggestion.title,
            journalName: input.journalName,
            manuscriptNumber: suggestion.manuscriptNumber,
            eventDate: suggestion.eventDate,
          },
          article,
        )
      : null

  const applied = await applyMailEvent({
    kind: suggestion.kind,
    decision,
    articleId: article.id,
    journalName: input.journalName.trim(),
    submissionId: knownSubmission?.id ?? null,
    manuscriptNumber: suggestion.manuscriptNumber,
    eventDate: suggestion.eventDate,
  })

  await prisma.publicationMailSuggestion.update({
    where: { id: suggestion.id },
    data: {
      status: 'APPLIED',
      articleId: article.id,
      submissionId: applied.submissionId,
      resolvedAt: new Date(),
      resolvedById: input.adminId,
    },
  })
  return { articleId: article.id }
}

export type CreateArticleFromSuggestionInput = {
  suggestionId: string
  journalName: string
  scope: ArticleScope
  adminId: string
}

export async function createArticleFromSuggestion(input: CreateArticleFromSuggestionInput): Promise<{ articleId: string }> {
  const suggestion = await prisma.publicationMailSuggestion.findUnique({
    where: { id: input.suggestionId },
    select: { title: true, status: true },
  })
  if (!suggestion || suggestion.status !== 'PENDING') throw new Error('SUGGESTION_NOT_PENDING')
  const article = await prisma.article.create({
    data: { title: suggestion.title, scope: input.scope, createdById: input.adminId },
    select: { id: true },
  })
  return applySuggestion({
    suggestionId: input.suggestionId,
    articleId: article.id,
    journalName: input.journalName,
    adminId: input.adminId,
  })
}

export async function dismissSuggestion(suggestionId: string, adminId: string): Promise<{ id: string }> {
  const dismissed = await prisma.publicationMailSuggestion.updateMany({
    where: { id: suggestionId, status: 'PENDING' },
    data: { status: 'DISMISSED', resolvedAt: new Date(), resolvedById: adminId },
  })
  if (dismissed.count === 0) throw new Error('SUGGESTION_NOT_PENDING')
  return { id: suggestionId }
}
