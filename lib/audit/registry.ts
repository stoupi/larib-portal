import type { AuditEntity } from '@/app/generated/prisma'
import type { AuditRecord } from './diff'

export type AuditReference = {
  model: string
  labelFields: readonly string[]
}

export type AuditedModelConfig = {
  entity: AuditEntity
  auditedFields: readonly string[]
  labelFields: readonly string[]
  // Null for pivot rows (a submission, an authorship): they have no name of their own
  // and borrow their publication's title, resolved when the event is written.
  buildLabel: (record: AuditRecord) => string | null
  articleIdField: string | null
  ignoredFields: readonly string[]
  referenceFields: Readonly<Record<string, AuditReference>>
}

const BOOKKEEPING_FIELDS = ['id', 'createdAt', 'updatedAt'] as const

function text(record: AuditRecord, field: string): string {
  const value = record[field]
  return typeof value === 'string' ? value.trim() : ''
}

export function joinLabel(parts: readonly string[]): string | null {
  const label = parts.filter((part) => part.length > 0).join(' ')
  return label.length > 0 ? label : null
}

export function labelFromFields(record: AuditRecord, fields: readonly string[]): string | null {
  return joinLabel(fields.map((field) => text(record, field)))
}

const JOURNAL_REFERENCE: AuditReference = { model: 'journal', labelFields: ['name'] }
const CENTRE_REFERENCE: AuditReference = { model: 'centre', labelFields: ['name'] }
const STUDY_REFERENCE: AuditReference = { model: 'study', labelFields: ['title'] }
const AUTHOR_REFERENCE: AuditReference = { model: 'author', labelFields: ['firstName', 'lastName'] }
export const ARTICLE_REFERENCE: AuditReference = { model: 'article', labelFields: ['title'] }

export const AUDITED_MODELS: Readonly<Record<string, AuditedModelConfig>> = {
  Article: {
    entity: 'ARTICLE',
    auditedFields: [
      'title',
      'type',
      'scope',
      'status',
      'studyId',
      'abstract',
      'contributorsNote',
      'pubmedId',
      'doi',
      'publishedJournalId',
      'publishedAt',
      'receivedAt',
      'acceptedAt',
      'pdfUrl',
      'statisticianId',
    ],
    labelFields: ['title'],
    buildLabel: (record) => joinLabel([text(record, 'title')]),
    articleIdField: 'id',
    ignoredFields: [...BOOKKEEPING_FIELDS, 'reviewDelayDays', 'pdfKey', 'carouselEmailSentAt', 'createdById'],
    referenceFields: {
      studyId: STUDY_REFERENCE,
      publishedJournalId: JOURNAL_REFERENCE,
      statisticianId: AUTHOR_REFERENCE,
    },
  },
  Submission: {
    entity: 'SUBMISSION',
    auditedFields: ['articleId', 'journalId', 'submittedAt', 'status', 'decidedAt', 'invitedToResubmit', 'notes'],
    labelFields: ['articleId'],
    buildLabel: () => null,
    articleIdField: 'articleId',
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { journalId: JOURNAL_REFERENCE, articleId: ARTICLE_REFERENCE },
  },
  JournalTarget: {
    entity: 'JOURNAL_TARGET',
    auditedFields: ['articleId', 'journalId', 'rank'],
    labelFields: [],
    buildLabel: () => null,
    articleIdField: 'articleId',
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { journalId: JOURNAL_REFERENCE, articleId: ARTICLE_REFERENCE },
  },
  Author: {
    entity: 'AUTHOR',
    auditedFields: [
      'firstName',
      'lastName',
      'degrees',
      'initials',
      'email',
      'orcid',
      'defaultAffiliationId',
      'userId',
      'centreId',
      'type',
    ],
    labelFields: ['firstName', 'lastName'],
    buildLabel: (record) => joinLabel([text(record, 'firstName'), text(record, 'lastName')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS, 'emails'],
    referenceFields: { centreId: CENTRE_REFERENCE },
  },
  Authorship: {
    entity: 'AUTHORSHIP',
    auditedFields: ['articleId', 'authorId', 'order', 'isCorresponding'],
    labelFields: [],
    buildLabel: () => null,
    articleIdField: 'articleId',
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { authorId: AUTHOR_REFERENCE, articleId: ARTICLE_REFERENCE },
  },
  AuthorshipAffiliation: {
    entity: 'AUTHORSHIP_AFFILIATION',
    auditedFields: ['authorshipId', 'affiliationId', 'order'],
    labelFields: [],
    buildLabel: () => null,
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: {},
  },
  AuthorAffiliation: {
    entity: 'AUTHOR_AFFILIATION',
    auditedFields: ['authorId', 'raw', 'order'],
    labelFields: ['raw'],
    buildLabel: (record) => joinLabel([text(record, 'raw')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { authorId: AUTHOR_REFERENCE },
  },
  AuthorCentre: {
    entity: 'AUTHOR_CENTRE',
    auditedFields: ['authorId', 'centreId', 'isPrimary', 'order'],
    labelFields: [],
    buildLabel: () => null,
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { authorId: AUTHOR_REFERENCE, centreId: CENTRE_REFERENCE },
  },
  Affiliation: {
    entity: 'AFFILIATION',
    auditedFields: ['name', 'raw', 'institution', 'department', 'city', 'country', 'centreId'],
    labelFields: ['name'],
    buildLabel: (record) => joinLabel([text(record, 'name')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { centreId: CENTRE_REFERENCE },
  },
  Centre: {
    entity: 'CENTRE',
    auditedFields: ['name', 'shortCode', 'parentOrganisation', 'city', 'country', 'isOwn'],
    labelFields: ['name'],
    buildLabel: (record) => joinLabel([text(record, 'name')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: {},
  },
  CentreAlias: {
    entity: 'CENTRE_ALIAS',
    auditedFields: ['centreId', 'alias', 'normalized'],
    labelFields: ['alias'],
    buildLabel: (record) => joinLabel([text(record, 'alias')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { centreId: CENTRE_REFERENCE },
  },
  Journal: {
    entity: 'JOURNAL',
    auditedFields: [
      'name',
      'abbreviation',
      'issn',
      'publisher',
      'impactFactor',
      'sjr',
      'sjrYear',
      'category',
      'url',
      'specialty',
      'subSpecialty',
      'openAccess',
      'typicalDelayDays',
    ],
    labelFields: ['name'],
    buildLabel: (record) => joinLabel([text(record, 'name')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: {},
  },
  Study: {
    entity: 'STUDY',
    auditedFields: [
      'title',
      'nctId',
      'acronym',
      'description',
      'domain',
      'funding',
      'enrollment',
      'status',
      'startDate',
      'endDate',
    ],
    labelFields: ['title', 'acronym'],
    buildLabel: (record) => joinLabel([text(record, 'acronym') || text(record, 'title')]),
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS, 'lastSyncedAt', 'createdById'],
    referenceFields: {},
  },
  StudyInvestigator: {
    entity: 'STUDY_INVESTIGATOR',
    auditedFields: ['studyId', 'authorId', 'role', 'centreId'],
    labelFields: [],
    buildLabel: () => null,
    articleIdField: null,
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { studyId: STUDY_REFERENCE, authorId: AUTHOR_REFERENCE, centreId: CENTRE_REFERENCE },
  },
  PublicationRequest: {
    entity: 'PUBLICATION_REQUEST',
    auditedFields: ['kind', 'articleId', 'requestedById', 'note', 'message', 'status', 'resolvedAt', 'resolvedById'],
    labelFields: [],
    buildLabel: () => null,
    articleIdField: 'articleId',
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: { articleId: ARTICLE_REFERENCE },
  },
}

export function auditConfigFor(model: string): AuditedModelConfig | null {
  return AUDITED_MODELS[model] ?? null
}

export function auditSelectionFor(model: string): Record<string, true> | null {
  const config = auditConfigFor(model)
  if (!config) return null
  const fields = new Set<string>(['id', ...config.auditedFields, ...config.labelFields])
  return Object.fromEntries([...fields].map((field) => [field, true as const]))
}
