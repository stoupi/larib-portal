'use server'

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { appAdminAction, appMemberAction, authenticatedAction } from '@/actions/safe-action'
import { canAccessApp, canAdminApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { addSubmission, updateSubmissionStatus, updateSubmission, deleteSubmission, userOwnsSubmission, SUBMISSION_STATUSES } from '@/lib/services/publications/submissions'
import { userIsAuthorOfArticle } from '@/lib/services/publications/my-publications'
import { createDraftArticle, updateArticleCore, deleteDraft, userIsFirstAuthor, setArticlePdf, setArticleAuthors, setArticleStatistician, getViewerIdentity, findOrCreateAuthorForUser } from '@/lib/services/publications/publication-editor'
import { searchPubmedWithLibraryMatches, buildRecordPreview, loadRecordWithPreview } from '@/lib/services/publications/pubmed-search'
import { viewerIsAmongAuthors, defaultPubmedQueryForViewer } from '@/lib/publications/pubmed-import'
import {
  createAuthorListRequest,
  reportPublicationIssue,
  resolveAuthorRequest,
  resolveAllAuthorRequests,
  PUBLICATIONS_REQUESTS_TAG,
} from '@/lib/services/publications/publication-requests'
import { recordPublicationEmail, PUBLICATIONS_EMAILS_TAG } from '@/lib/services/publications/email-log'
import { buildRecapForMember, sendRecapToMember } from '@/lib/services/publications/recap-send'
import {
  listRecapCopyRecipients,
  setPublicationsRecapOptOut,
  setRecapCopyRecipients,
} from '@/lib/services/publications/recap'
import {
  acceptedRecapWindow,
  listAcceptedPapersSince,
  listAcceptedRecapRecipients,
  sendAcceptedRecapTo,
  setAcceptedRecapRecipients,
} from '@/lib/services/publications/accepted-recap'
import { renderAcceptedPapersEmail } from '@/lib/services/email'
import { resolveAppBaseUrl } from '@/lib/app-url'
import { renderCarouselRequestEmailHtml } from '@/lib/email/carousel-template'
import { searchByAuthor, fetchByPmids } from '@/lib/services/publications/pubmed'
import {
  importRecords,
  fillArticleFromRecord,
  PUBLICATIONS_JOURNALS_TAG,
  PUBLICATIONS_AUTHORS_TAG,
  PUBLICATIONS_ARTICLES_TAG,
} from '@/lib/services/publications/import'
import { setAuthorAffiliations, updateAuthor, deleteAuthor, deleteAuthorWithAuthorships, mergeAuthors, recomputeAuthorCentres, createAuthor, getAuthorDetail, getAuthorForEdit, resolveAuthorAffiliations, isPrismaKnownError } from '@/lib/services/publications/authors'
import { findAuthorDuplicates, matchAuthorsAgainstBank, normalizeName } from '@/lib/services/publications/author-dedup'
import { fetchPublicationByIdentifier } from '@/lib/services/publications/publication-lookup'
import { backfillAffiliations, PUBLICATIONS_CENTRES_TAG, PUBLICATIONS_AFFILIATIONS_TAG } from '@/lib/services/publications/affiliations'
import { renameCentre, setCentreOwn, deleteCentre, mergeCentres, getCentreAuthors, getCentreStudies, createCentre, updateCentre, listCentreOptions } from '@/lib/services/publications/centres'
import { updateArticleStatus, updateArticleType, updateArticleStudy, updateArticleScope, deleteArticle, userCreatedArticleInPreparation, ARTICLE_STATUSES,
  setArticleLinkedinPost,
} from '@/lib/services/publications/articles'
import { ARTICLE_TYPE_VALUES } from '@/lib/publications/article-type'
import { ARTICLE_SCOPES } from '@/lib/publications/article-scope'
import { findLibraryDuplicates } from '@/lib/services/publications/duplicates'
import { createJournal, updateJournal, deleteJournal, isPrismaKnownError as isJournalError } from '@/lib/services/publications/journals'
import { searchCrossref, lookupJournalByIssn } from '@/lib/services/publications/journals-catalog'
import { JOURNAL_SPECIALTIES, JOURNAL_SUB_SPECIALTIES } from '@/lib/publications/journal-taxonomy'
import { refreshJournalSjr } from '@/lib/services/publications/sjr'
import { createStudy, updateStudy, deleteStudy, importClinicalTrialStudy, setStudyStatus, linkCentreToStudy, unlinkCentreFromStudy, setStudyInvestigator, removeStudyInvestigator, linkArticleToStudy, unlinkArticleFromStudy, STUDY_STATUSES, PUBLICATIONS_STUDIES_TAG } from '@/lib/services/publications/studies'
import { previewCentreResolutions } from '@/lib/services/publications/centre-resolve'
import { previewInvestigatorResolutions, listAuthorOptions } from '@/lib/services/publications/investigator-resolve'
import { fetchClinicalTrial, normaliseNctId } from '@/lib/services/publications/clinicaltrials'
import { getCarouselEmailData, markCarouselEmailSent } from '@/lib/services/publications/carousel-email'
import { CAROUSEL_CC_RECIPIENTS, CAROUSEL_REPLY_TO } from '@/lib/publications/carousel-email'
import { sendCarouselRequestEmail } from '@/lib/services/email'

const CANDIDATE_ABSTRACT_PREVIEW_LENGTH = 400

export const searchBacklogAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ query: z.string().min(1), retmax: z.number().int().min(1).max(500).optional() }))
  .action(async ({ parsedInput }) => searchPubmedWithLibraryMatches(parsedInput.query, parsedInput.retmax ?? 200))

export const fetchCandidateDetailAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ pmid: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const preview = await buildRecordPreview(parsedInput.pmid, null)
    if (!preview) return null
    return {
      authors: preview.authors.map(({ name, team }) => ({ name, team })),
      abstract: preview.abstract ? preview.abstract.slice(0, CANDIDATE_ABSTRACT_PREVIEW_LENGTH) : null,
      doi: preview.doi,
    }
  })

export const importBacklogAction = appAdminAction('PUBLICATIONS')
  .inputSchema(
    z.object({
      papers: z.array(z.object({ pmid: z.string().min(1), scope: z.enum(ARTICLE_SCOPES) })).min(1),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const scopeByPmid = new Map(parsedInput.papers.map((paper) => [paper.pmid, paper.scope]))
    const records = await fetchByPmids(parsedInput.papers.map((paper) => paper.pmid))
    const report = await importRecords(records, ctx.userId, scopeByPmid)
    const duplicates = await findLibraryDuplicates()
    revalidateTag(PUBLICATIONS_JOURNALS_TAG)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return { report, duplicates }
  })

const AuthorInput = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  degrees: z.array(z.string()).default([]),
  orcid: z.string().trim().optional().nullable(),
  userId: z.string().optional().nullable(),
  emails: z.array(z.string().email()).default([]),
  centreIds: z.array(z.string()).default([]),
  affiliations: z.array(z.string()).default([]),
})

export const updateAuthorAction = appAdminAction('PUBLICATIONS')
  .inputSchema(AuthorInput)
  .action(async ({ parsedInput }) => {
    const updated = await updateAuthor({
      id: parsedInput.id,
      firstName: parsedInput.firstName,
      lastName: parsedInput.lastName,
      degrees: parsedInput.degrees.length ? parsedInput.degrees.join(', ') : null,
      orcid: parsedInput.orcid || null,
      userId: parsedInput.userId || null,
      emails: parsedInput.emails,
      centreIds: parsedInput.centreIds,
      affiliations: parsedInput.affiliations,
    })
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return updated
  })

export const getAuthorForEditAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => getAuthorForEdit(parsedInput.id))

export const recomputeAuthorCentresAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({}))
  .action(async () => {
    const result = await recomputeAuthorCentres()
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return result
  })

export const deleteAuthorAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), detachFromPublications: z.boolean().default(false) }))
  .action(async ({ parsedInput }) => {
    if (parsedInput.detachFromPublications) {
      const deleted = await deleteAuthorWithAuthorships(parsedInput.id)
      revalidateTag(PUBLICATIONS_AUTHORS_TAG)
      revalidateTag(PUBLICATIONS_ARTICLES_TAG)
      return deleted
    }
    try {
      const deleted = await deleteAuthor(parsedInput.id)
      revalidateTag(PUBLICATIONS_AUTHORS_TAG)
      return deleted
    } catch (error) {
      if (isPrismaKnownError(error, 'P2003')) throw new Error('AUTHOR_IN_USE')
      throw error
    }
  })

export const getAuthorDetailAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => getAuthorDetail(parsedInput.id))

export const mergeAuthorsAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ keepId: z.string().min(1), mergeIds: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await mergeAuthors(parsedInput.keepId, parsedInput.mergeIds)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return result
  })

export const backfillAffiliationsAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ anchor: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const candidates = await searchByAuthor(parsedInput.anchor, 500)
    const records = await fetchByPmids(candidates.map((candidate) => candidate.pmid))
    const report = await backfillAffiliations(records)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    revalidateTag(PUBLICATIONS_AFFILIATIONS_TAG)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return report
  })

export const renameCentreAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await renameCentre(parsedInput.id, parsedInput.name)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    return result
  })

export const setCentreOwnAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), isOwn: z.boolean() }))
  .action(async ({ parsedInput }) => {
    const result = await setCentreOwn(parsedInput.id, parsedInput.isOwn)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    return result
  })

export const mergeCentresAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ keepId: z.string().min(1), mergeIds: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await mergeCentres(parsedInput.keepId, parsedInput.mergeIds)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    return result
  })

export const deleteCentreAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await deleteCentre(parsedInput.id)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    return result
  })

export const createCentreAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ name: z.string().min(1), shortCode: z.string().optional().nullable(), parentOrganisation: z.string().optional().nullable(), city: z.string().optional().nullable(), country: z.string().optional().nullable(), isOwn: z.boolean().default(false) }))
  .action(async ({ parsedInput }) => {
    const result = await createCentre(parsedInput)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    return result
  })

export const updateCentreAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), name: z.string().min(1), shortCode: z.string().optional().nullable(), parentOrganisation: z.string().optional().nullable(), city: z.string().optional().nullable(), country: z.string().optional().nullable(), isOwn: z.boolean().default(false) }))
  .action(async ({ parsedInput }) => {
    const result = await updateCentre(parsedInput)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    return result
  })

export const getCentreAuthorsAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => getCentreAuthors(parsedInput.id))

export const getCentreStudiesAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => getCentreStudies(parsedInput.id))

export const updateArticleStatusAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), status: z.enum(ARTICLE_STATUSES) }))
  .action(async ({ parsedInput }) => {
    const updated = await updateArticleStatus(parsedInput.id, parsedInput.status)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return updated
  })

export const deleteArticleAction = authenticatedAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    const canDelete =
      canAdminApp(ctx.user, 'PUBLICATIONS') ||
      (await userCreatedArticleInPreparation(ctx.userId, parsedInput.id))
    if (!canDelete) throw new Error('Forbidden')
    const result = await deleteArticle(parsedInput.id)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return result
  })

export const updateArticleStudyAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), studyId: z.string().nullable() }))
  .action(async ({ parsedInput }) => {
    const updated = await updateArticleStudy(parsedInput.id, parsedInput.studyId)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return updated
  })

export const updateArticleScopeAction = authenticatedAction
  .inputSchema(z.object({ id: z.string().min(1), scope: z.enum(ARTICLE_SCOPES) }))
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    const canEdit = canAdminApp(ctx.user, 'PUBLICATIONS') || (await userIsFirstAuthor(ctx.userId, parsedInput.id))
    if (!canEdit) throw new Error('Forbidden')
    const updated = await updateArticleScope(parsedInput.id, parsedInput.scope)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return updated
  })

export const previewRecapAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ userId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const recap = await buildRecapForMember(parsedInput.userId)
    return recap ?? { nothingToSay: true as const }
  })

export const sendRecapAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ userId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const cc = await listRecapCopyRecipients()
    const result = await sendRecapToMember({ userId: parsedInput.userId, cc, sentById: ctx.userId })
    if (result.outcome === 'failed') throw new Error(result.error ?? 'SEND_FAILED')
    revalidateTag(PUBLICATIONS_EMAILS_TAG)
    return { outcome: result.outcome }
  })

export const setRecapOptOutAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ userId: z.string().min(1), optedOut: z.boolean() }))
  .action(async ({ parsedInput }) => {
    await setPublicationsRecapOptOut(parsedInput.userId, parsedInput.optedOut)
    revalidateTag(PUBLICATIONS_EMAILS_TAG)
    return { optedOut: parsedInput.optedOut }
  })

export const setRecapCopyRecipientsAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ emails: z.array(z.string().trim().email()) }))
  .action(async ({ parsedInput }) => {
    const saved = await setRecapCopyRecipients(parsedInput.emails)
    revalidateTag(PUBLICATIONS_EMAILS_TAG)
    return { emails: saved }
  })

export const setAcceptedRecapRecipientsAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ emails: z.array(z.string().trim().email()) }))
  .action(async ({ parsedInput }) => {
    await setAcceptedRecapRecipients(parsedInput.emails)
    revalidateTag(PUBLICATIONS_EMAILS_TAG)
    return { emails: parsedInput.emails }
  })

export const previewAcceptedRecapAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({}))
  .action(async () => {
    const since = await acceptedRecapWindow()
    const papers = await listAcceptedPapersSince(since)
    if (papers.length === 0) return { nothingToSay: true as const }
    const rendered = renderAcceptedPapersEmail({
      locale: 'fr',
      firstName: null,
      papers,
      since,
      appUrl: resolveAppBaseUrl(),
    })
    return { subject: rendered.subject, html: rendered.html, since: since.toISOString(), papers: papers.length }
  })

export const sendAcceptedRecapAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    const since = await acceptedRecapWindow()
    const papers = await listAcceptedPapersSince(since)
    if (papers.length === 0) return { outcome: 'nothingToSay' as const, sent: 0 }

    const recipients = await listAcceptedRecapRecipients()
    let sent = 0
    for (const email of recipients) {
      const result = await sendAcceptedRecapTo({ email, papers, since, sentById: ctx.userId })
      if (result.outcome === 'failed') throw new Error(result.error ?? 'SEND_FAILED')
      if (result.outcome === 'sent') sent += 1
    }
    revalidateTag(PUBLICATIONS_EMAILS_TAG)
    return { outcome: 'sent' as const, sent }
  })

export const setLinkedinPostAction = appAdminAction('PUBLICATIONS')
  .inputSchema(
    z.object({
      id: z.string().min(1),
      url: z.string().trim().url().nullable(),
      postedAt: z.string().nullable(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const updated = await setArticleLinkedinPost(parsedInput.id, {
      url: parsedInput.url,
      postedAt: parsedInput.postedAt ? new Date(parsedInput.postedAt) : null,
    })
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return updated
  })

export const updateArticleTypeAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), type: z.enum(ARTICLE_TYPE_VALUES) }))
  .action(async ({ parsedInput }) => {
    const updated = await updateArticleType(parsedInput.id, parsedInput.type)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return updated
  })

const JournalInput = z.object({
  name: z.string().min(1),
  abbreviation: z.string().optional().nullable(),
  issn: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  impactFactor: z.number().min(0).max(1000).optional().nullable(),
  sjr: z.number().min(0).max(1000).optional().nullable(),
  url: z.string().optional().nullable(),
  specialty: z.enum(JOURNAL_SPECIALTIES).optional().nullable(),
  subSpecialty: z.enum(JOURNAL_SUB_SPECIALTIES).optional().nullable(),
  openAccess: z.boolean().optional(),
  typicalDelayDays: z.number().int().min(0).max(3650).optional().nullable(),
})

export const lookupJournalIssnAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ issn: z.string().min(4) }))
  .action(async ({ parsedInput }) => lookupJournalByIssn(parsedInput.issn))

export const searchCrossrefAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ query: z.string().min(1) }))
  .action(async ({ parsedInput }) => searchCrossref(parsedInput.query))

export const addJournalAction = appAdminAction('PUBLICATIONS')
  .inputSchema(JournalInput)
  .action(async ({ parsedInput }) => {
    try {
      const created = await createJournal(parsedInput)
      revalidateTag(PUBLICATIONS_JOURNALS_TAG)
      return created
    } catch (error) {
      if (isJournalError(error, 'P2002')) throw new Error('JOURNAL_EXISTS')
      throw error
    }
  })

export const updateJournalAction = appAdminAction('PUBLICATIONS')
  .inputSchema(JournalInput.extend({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput
    const updated = await updateJournal(id, rest)
    revalidateTag(PUBLICATIONS_JOURNALS_TAG)
    return updated
  })

export const deleteJournalAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    try {
      const deleted = await deleteJournal(parsedInput.id)
      revalidateTag(PUBLICATIONS_JOURNALS_TAG)
      return deleted
    } catch (error) {
      if (isJournalError(error, 'P2003')) throw new Error('JOURNAL_IN_USE')
      throw error
    }
  })

export const refreshSjrAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({}))
  .action(async () => {
    const result = await refreshJournalSjr()
    revalidateTag(PUBLICATIONS_JOURNALS_TAG)
    return result
  })

const CreateAuthorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  degrees: z.array(z.string()).default([]),
  emails: z.array(z.string().email()).default([]),
  orcid: z.string().trim().optional().nullable(),
  centreIds: z.array(z.string()).default([]),
  affiliations: z.array(z.string()).default([]),
  userId: z.string().optional().nullable(),
  confirmDuplicate: z.boolean().default(false),
})

export const createAuthorAction = appMemberAction('PUBLICATIONS')
  .inputSchema(CreateAuthorSchema)
  .action(async ({ parsedInput }) => {
    const { orcidMatch, nameMatches } = await findAuthorDuplicates({
      orcid: parsedInput.orcid ?? null,
      firstName: parsedInput.firstName,
      lastName: parsedInput.lastName,
    })
    if (orcidMatch) {
      return { status: 'blocked' as const, reason: 'ORCID' as const, match: { id: orcidMatch.id, firstName: orcidMatch.firstName, lastName: orcidMatch.lastName } }
    }
    if (nameMatches.length > 0 && !parsedInput.confirmDuplicate) {
      return { status: 'warning' as const, reason: 'NAME' as const, matches: nameMatches.map((match) => ({ id: match.id, firstName: match.firstName, lastName: match.lastName })) }
    }
    const created = await createAuthor({
      firstName: parsedInput.firstName,
      lastName: parsedInput.lastName,
      degrees: parsedInput.degrees.length ? parsedInput.degrees.join(', ') : null,
      emails: parsedInput.emails,
      orcid: parsedInput.orcid ?? null,
      centreIds: parsedInput.centreIds,
      affiliations: parsedInput.affiliations,
      userId: parsedInput.userId ?? null,
    })
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return { status: 'created' as const, author: created }
  })

export const resolveAuthorAffiliationsAction = appMemberAction('PUBLICATIONS')
  .inputSchema(z.object({ authorIds: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput }) => resolveAuthorAffiliations(parsedInput.authorIds))

export const fetchPublicationAuthorsAction = appMemberAction('PUBLICATIONS')
  .inputSchema(z.object({ identifier: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const publication = await fetchPublicationByIdentifier(parsedInput.identifier)
    const bank = await prisma.author.findMany({ select: { id: true, firstName: true, lastName: true, orcid: true } })
    const authors = matchAuthorsAgainstBank(bank, publication.authors)
    return { publication: { title: publication.title, journal: publication.journal, year: publication.year, doi: publication.doi }, authors }
  })

export const addAuthorsFromPublicationAction = appMemberAction('PUBLICATIONS')
  .inputSchema(z.object({
    authors: z.array(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      orcid: z.string().nullable().optional(),
      affiliationRaw: z.string().nullable().optional(),
    })).min(1),
  }))
  .action(async ({ parsedInput }) => {
    const bank = await prisma.author.findMany({ select: { id: true, firstName: true, lastName: true, orcid: true } })
    const rows = matchAuthorsAgainstBank(bank, parsedInput.authors)
    const toCreate = rows.filter((row) => row.status === 'new')
    const seenKeys = new Set<string>()
    let created = 0
    for (const author of toCreate) {
      const orcid = author.orcid?.trim()
      const dedupKey = orcid
        ? `orcid:${orcid}`
        : `name:${normalizeName(author.firstName)}|${normalizeName(author.lastName)}`
      if (seenKeys.has(dedupKey)) continue
      seenKeys.add(dedupKey)
      await createAuthor({ firstName: author.firstName, lastName: author.lastName, orcid: author.orcid ?? null, affiliations: author.affiliationRaw ? [author.affiliationRaw] : [] })
      created += 1
    }
    if (created > 0) revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return { created, skipped: rows.length - created }
  })

const StudyInputSchema = z.object({
  title: z.string().min(1),
  acronym: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
  funding: z.string().optional().nullable(),
  enrollment: z.number().int().nonnegative().optional().nullable(),
  status: z.enum(STUDY_STATUSES),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  piIds: z.array(z.string()),
  coInvestigatorIds: z.array(z.string()),
  centreIds: z.array(z.string()),
})

export const createStudyAction = appAdminAction('PUBLICATIONS')
  .inputSchema(StudyInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const created = await createStudy(parsedInput, ctx.userId)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return created
  })

export const updateStudyAction = appAdminAction('PUBLICATIONS')
  .inputSchema(StudyInputSchema.extend({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput
    const updated = await updateStudy(id, rest)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return updated
  })

export const deleteStudyAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const deleted = await deleteStudy(parsedInput.id)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return deleted
  })

export const setStudyStatusAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), status: z.enum(STUDY_STATUSES) }))
  .action(async ({ parsedInput }) => {
    const updated = await setStudyStatus(parsedInput.id, parsedInput.status)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return updated
  })

export const linkStudyCentreAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ studyId: z.string().min(1), centreId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await linkCentreToStudy(parsedInput.studyId, parsedInput.centreId)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return result
  })

export const unlinkStudyCentreAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ studyId: z.string().min(1), centreId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await unlinkCentreFromStudy(parsedInput.studyId, parsedInput.centreId)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return result
  })

export const setStudyInvestigatorAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ studyId: z.string().min(1), authorId: z.string().min(1), role: z.enum(['PI', 'CO_INVESTIGATOR']), centreId: z.string().optional().nullable() }))
  .action(async ({ parsedInput }) => {
    const result = await setStudyInvestigator(parsedInput.studyId, parsedInput.authorId, parsedInput.role, parsedInput.centreId ?? null)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return result
  })

export const removeStudyInvestigatorAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ studyId: z.string().min(1), authorId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await removeStudyInvestigator(parsedInput.studyId, parsedInput.authorId)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return result
  })

export const linkStudyArticleAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ studyId: z.string().min(1), articleId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await linkArticleToStudy(parsedInput.studyId, parsedInput.articleId)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return result
  })

export const unlinkStudyArticleAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ studyId: z.string().min(1), articleId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await unlinkArticleFromStudy(parsedInput.studyId, parsedInput.articleId)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return result
  })

export const previewClinicalTrialAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ nctId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const normalised = normaliseNctId(parsedInput.nctId)
    if (!normalised) return { ok: false as const, error: 'INVALID_NCT_ID' }
    const existing = await prisma.study.findUnique({ where: { nctId: normalised }, select: { id: true } })
    if (existing) return { ok: false as const, error: 'DUPLICATE' }
    try {
      const preview = await fetchClinicalTrial(normalised)
      const [centres, bank, investigators, authorBank] = await Promise.all([
        previewCentreResolutions(prisma, preview.centres.map((centre) => centre.name)),
        listCentreOptions(),
        previewInvestigatorResolutions(prisma, preview.investigators),
        listAuthorOptions(prisma),
      ])
      return { ok: true as const, preview, centres, bank, investigators, authorBank }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'FETCH_FAILED'
      return { ok: false as const, error: reason }
    }
  })

export const importClinicalTrialAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({
    nctId: z.string().min(1),
    centreOverrides: z.array(z.object({ rawName: z.string().min(1), centreId: z.string().min(1) })).default([]),
    investigatorOverrides: z.array(z.object({ key: z.string().min(1), authorId: z.string().min(1) })).default([]),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const normalised = normaliseNctId(parsedInput.nctId)
    if (!normalised) return { ok: false as const, error: 'INVALID_NCT_ID' }
    try {
      const preview = await fetchClinicalTrial(normalised)
      const result = await importClinicalTrialStudy(preview, ctx.userId, parsedInput.centreOverrides, parsedInput.investigatorOverrides)
      revalidateTag(PUBLICATIONS_STUDIES_TAG)
      revalidateTag(PUBLICATIONS_CENTRES_TAG)
      return { ok: true as const, result }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'IMPORT_FAILED'
      return { ok: false as const, error: reason }
    }
  })

// ---- Submission tracking: first authors curate their own, publications admins curate any ----

function canCurateAnySubmission(user: Parameters<typeof canAccessApp>[0]): boolean {
  return canAdminApp(user, 'PUBLICATIONS')
}

export const addSubmissionAction = authenticatedAction
  .inputSchema(
    z.object({
      articleId: z.string().min(1),
      journalName: z.string().min(1),
      submittedAt: z.string().min(1),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    if (!canCurateAnySubmission(ctx.user) && !(await userIsAuthorOfArticle(ctx.userId, parsedInput.articleId)))
      throw new Error('Forbidden')
    const added = await addSubmission({
      articleId: parsedInput.articleId,
      journalName: parsedInput.journalName,
      submittedAt: new Date(parsedInput.submittedAt),
    })
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return added
  })

export const updateSubmissionStatusAction = authenticatedAction
  .inputSchema(
    z.object({
      submissionId: z.string().min(1),
      status: z.enum(SUBMISSION_STATUSES),
      decidedAt: z.string().min(1).nullable(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    if (!canCurateAnySubmission(ctx.user) && !(await userOwnsSubmission(ctx.userId, parsedInput.submissionId)))
      throw new Error('Forbidden')
    const updated = await updateSubmissionStatus({
      submissionId: parsedInput.submissionId,
      status: parsedInput.status,
      decidedAt: parsedInput.decidedAt ? new Date(parsedInput.decidedAt) : null,
    })
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return updated
  })

// ---- User publication editor ----

export const createDraftArticleAction = authenticatedAction
  .inputSchema(z.object({ asAdmin: z.boolean().default(false) }))
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    const asAdmin = parsedInput.asAdmin && canAdminApp(ctx.user, 'PUBLICATIONS')
    return createDraftArticle(ctx.userId, { withCreatorAsFirstAuthor: !asAdmin })
  })

export const updateMyAffiliationsAction = authenticatedAction
  .inputSchema(z.object({ affiliations: z.array(z.string().trim().min(1).max(500)).max(10) }))
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    const authorId = await findOrCreateAuthorForUser(ctx.userId)
    const saved = await setAuthorAffiliations(authorId, parsedInput.affiliations)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return saved
  })

// ---- PubMed import, open to every member ----

const MEMBER_SEARCH_RETMAX = 60

export const searchPubmedCandidatesAction = appMemberAction('PUBLICATIONS')
  .inputSchema(z.object({ query: z.string().min(1) }))
  .action(async ({ parsedInput }) => searchPubmedWithLibraryMatches(parsedInput.query, MEMBER_SEARCH_RETMAX))

export const suggestPubmedQueryAction = appMemberAction('PUBLICATIONS')
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => ({ query: defaultPubmedQueryForViewer(await getViewerIdentity(ctx.userId)) }))

export const fetchPubmedRecordPreviewAction = appMemberAction('PUBLICATIONS')
  .inputSchema(z.object({ pmid: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) =>
    buildRecordPreview(parsedInput.pmid, await getViewerIdentity(ctx.userId)),
  )

// A member may only bring in a paper they signed; an admin keeps the unrestricted module.
// Their author record is created first when missing, so the PubMed author list matches it
// and the paper comes back attached to their account instead of to a nameless duplicate.
async function loadImportableRecord(userId: string, canImportAnyone: boolean, pmid: string) {
  const viewer = await getViewerIdentity(userId)
  const loaded = await loadRecordWithPreview(pmid, viewer)
  if (!loaded) throw new Error('PUBMED_RECORD_NOT_FOUND')
  const signedByViewer = viewerIsAmongAuthors(loaded.record.authors, viewer)
  if (!canImportAnyone && !signedByViewer) throw new Error('NOT_AN_AUTHOR')
  if (signedByViewer) await findOrCreateAuthorForUser(userId)
  return loaded
}

export const createArticleFromPubmedAction = authenticatedAction
  .inputSchema(z.object({ pmid: z.string().min(1), asAdmin: z.boolean().default(false) }))
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    const canImportAnyone = parsedInput.asAdmin && canAdminApp(ctx.user, 'PUBLICATIONS')
    const { record, preview } = await loadImportableRecord(ctx.userId, canImportAnyone, parsedInput.pmid)
    if (preview.existingArticleId) return { articleId: preview.existingArticleId, alreadyPresent: true }

    const report = await importRecords([record], ctx.userId, new Map([[record.pmid, preview.proposedScope]]))
    if (report.articlesCreated === 0) throw new Error('IMPORT_FAILED')
    const created = await prisma.article.findFirstOrThrow({ where: { pubmedId: record.pmid }, select: { id: true } })
    revalidateTag(PUBLICATIONS_JOURNALS_TAG)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return { articleId: created.id, alreadyPresent: false }
  })

export const importPubmedIntoArticleAction = authenticatedAction
  .inputSchema(z.object({ articleId: z.string().min(1), pmid: z.string().min(1), asAdmin: z.boolean().default(false) }))
  .action(async ({ parsedInput, ctx }) => {
    const isAdmin = canAdminApp(ctx.user, 'PUBLICATIONS')
    const canEdit = isAdmin || (await userIsFirstAuthor(ctx.userId, parsedInput.articleId))
    if (!canEdit) throw new Error('Forbidden')

    const canImportAnyone = parsedInput.asAdmin && isAdmin
    const { record, preview } = await loadImportableRecord(ctx.userId, canImportAnyone, parsedInput.pmid)
    if (preview.existingArticleId && preview.existingArticleId !== parsedInput.articleId) {
      return { articleId: preview.existingArticleId, alreadyPresent: true }
    }

    await fillArticleFromRecord(parsedInput.articleId, record, preview.proposedScope)
    revalidateTag(PUBLICATIONS_JOURNALS_TAG)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return { articleId: parsedInput.articleId, alreadyPresent: false }
  })

export const setArticleAuthorsAction = appAdminAction('PUBLICATIONS')
  .inputSchema(
    z.object({
      articleId: z.string().min(1),
      authors: z.array(z.object({ authorId: z.string().min(1), isCorresponding: z.boolean() })),
    }),
  )
  .action(async ({ parsedInput }) => {
    const updated = await setArticleAuthors(parsedInput.articleId, parsedInput.authors)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return updated
  })

export const updateArticleCoreAction = authenticatedAction
  .inputSchema(
    z.object({
      id: z.string().min(1),
      title: z.string(),
      type: z.enum(ARTICLE_TYPE_VALUES),
      status: z.enum(ARTICLE_STATUSES),
      studyId: z.string().nullable(),
      pubmedId: z.string().nullable(),
      doi: z.string().nullable(),
      contributorsNote: z.string().nullable(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const canEdit = canAdminApp(ctx.user, 'PUBLICATIONS') || (await userIsFirstAuthor(ctx.userId, parsedInput.id))
    if (!canEdit) throw new Error('Forbidden')
    const { id, ...rest } = parsedInput
    const updated = await updateArticleCore(id, {
      title: rest.title,
      type: rest.type,
      status: rest.status,
      studyId: rest.studyId || null,
      pubmedId: rest.pubmedId || null,
      doi: rest.doi || null,
      contributorsNote: rest.contributorsNote || null,
    })
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return updated
  })

export const setArticleStatisticianAction = authenticatedAction
  .inputSchema(z.object({ articleId: z.string().min(1), statisticianId: z.string().min(1).nullable() }))
  .action(async ({ parsedInput, ctx }) => {
    const canEdit = canAdminApp(ctx.user, 'PUBLICATIONS') || (await userIsFirstAuthor(ctx.userId, parsedInput.articleId))
    if (!canEdit) throw new Error('Forbidden')
    const saved = await setArticleStatistician(parsedInput.articleId, parsedInput.statisticianId)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return saved
  })

export const saveArticlePdfAction = authenticatedAction
  .inputSchema(z.object({ id: z.string().min(1), url: z.string().url(), key: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const canEdit = canAdminApp(ctx.user, 'PUBLICATIONS') || (await userIsFirstAuthor(ctx.userId, parsedInput.id))
    if (!canEdit) throw new Error('Forbidden')
    const saved = await setArticlePdf(parsedInput.id, { url: parsedInput.url, key: parsedInput.key })
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return saved
  })

export const removeArticlePdfAction = authenticatedAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const canEdit = canAdminApp(ctx.user, 'PUBLICATIONS') || (await userIsFirstAuthor(ctx.userId, parsedInput.id))
    if (!canEdit) throw new Error('Forbidden')
    const saved = await setArticlePdf(parsedInput.id, null)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return saved
  })

export const deleteDraftArticleAction = authenticatedAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const canEdit = canAdminApp(ctx.user, 'PUBLICATIONS') || (await userIsFirstAuthor(ctx.userId, parsedInput.id))
    if (!canEdit) throw new Error('Forbidden')
    return deleteDraft(parsedInput.id)
  })

export const updateSubmissionAction = authenticatedAction
  .inputSchema(z.object({ submissionId: z.string().min(1), journalName: z.string().min(1), submittedAt: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    if (!canCurateAnySubmission(ctx.user) && !(await userOwnsSubmission(ctx.userId, parsedInput.submissionId)))
      throw new Error('Forbidden')
    return updateSubmission({
      submissionId: parsedInput.submissionId,
      journalName: parsedInput.journalName,
      submittedAt: new Date(parsedInput.submittedAt),
    })
  })

export const deleteSubmissionAction = authenticatedAction
  .inputSchema(z.object({ submissionId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    if (!canCurateAnySubmission(ctx.user) && !(await userOwnsSubmission(ctx.userId, parsedInput.submissionId)))
      throw new Error('Forbidden')
    return deleteSubmission(parsedInput.submissionId)
  })

export const requestAuthorListAction = authenticatedAction
  .inputSchema(z.object({ articleId: z.string().min(1), note: z.string().nullable() }))
  .action(async ({ parsedInput, ctx }) => {
    if (!(await userIsAuthorOfArticle(ctx.userId, parsedInput.articleId))) throw new Error('Forbidden')
    try {
      return await createAuthorListRequest(parsedInput.articleId, ctx.userId, parsedInput.note || null)
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_EXISTS') throw new Error('REQUEST_EXISTS')
      throw error
    }
  })

export const reportPublicationIssueAction = authenticatedAction
  .inputSchema(z.object({ articleId: z.string().min(1), message: z.string().trim().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    if (!(await userIsAuthorOfArticle(ctx.userId, parsedInput.articleId))) throw new Error('Forbidden')
    const result = await reportPublicationIssue(parsedInput.articleId, ctx.userId, parsedInput.message)
    revalidateTag(PUBLICATIONS_REQUESTS_TAG)
    return result
  })

export const resolveAuthorRequestAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), outcome: z.enum(['RESOLVED', 'DISMISSED']) }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await resolveAuthorRequest(parsedInput.id, ctx.userId, parsedInput.outcome)
    revalidateTag(PUBLICATIONS_REQUESTS_TAG)
    return result
  })

export const resolveAllAuthorRequestsAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    const result = await resolveAllAuthorRequests(ctx.userId)
    revalidateTag(PUBLICATIONS_REQUESTS_TAG)
    return result
  })

export const prepareCarouselEmailAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ articleId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const data = await getCarouselEmailData(parsedInput.articleId)
    if (!data) throw new Error('NOT_FOUND')
    return data
  })

export const sendCarouselEmailAction = appAdminAction('PUBLICATIONS')
  .inputSchema(
    z.object({
      articleId: z.string().min(1),
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const result = await sendCarouselRequestEmail({
      to: parsedInput.to,
      cc: [...CAROUSEL_CC_RECIPIENTS],
      replyTo: CAROUSEL_REPLY_TO,
      subject: parsedInput.subject,
      body: parsedInput.body,
    })
    const failed = 'error' in result
    await recordPublicationEmail({
      kind: 'CAROUSEL_REQUEST',
      articleId: parsedInput.articleId,
      to: [parsedInput.to],
      cc: [...CAROUSEL_CC_RECIPIENTS],
      subject: parsedInput.subject,
      bodyText: parsedInput.body,
      bodyHtml: renderCarouselRequestEmailHtml(parsedInput.body, parsedInput.subject),
      status: failed ? 'FAILED' : 'SENT',
      error: failed ? result.error : null,
      providerId: failed ? null : result.id,
      sentById: ctx.userId,
    })
    revalidateTag(PUBLICATIONS_EMAILS_TAG)
    if (failed) throw new Error(result.error)
    const sentAt = new Date()
    await markCarouselEmailSent(parsedInput.articleId, sentAt)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return { sentAt: sentAt.toISOString() }
  })
