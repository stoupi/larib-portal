import { prisma } from '@/lib/prisma'
import { toJsonValue } from '@/lib/corelab/crf/json'
import { crfDefinitionSchema, parseCrfDefinition, type CrfDefinition } from '@/lib/corelab/crf/schema'
import { assertLockedIdsKept, diffVersions, worstImpact, type VersionChange } from '@/lib/corelab/crf/diff-versions'
import { assertStudyOpen } from './studies'

export type DraftVersion = {
  id: string
  number: number
  definition: CrfDefinition
  basedOn: { number: number; definition: CrfDefinition } | null
}

export async function getDraft(studyId: string): Promise<DraftVersion | null> {
  const draft = await prisma.corelabCrfVersion.findFirst({
    where: { studyId, publishedAt: null },
    select: { id: true, number: true, definition: true },
    orderBy: { number: 'desc' },
  })
  if (!draft) return null

  const published = await prisma.corelabCrfVersion.findFirst({
    where: { studyId, publishedAt: { not: null } },
    select: { number: true, definition: true },
    orderBy: { number: 'desc' },
  })

  return {
    id: draft.id,
    number: draft.number,
    definition: parseCrfDefinition(draft.definition),
    basedOn: published ? { number: published.number, definition: parseCrfDefinition(published.definition) } : null,
  }
}

export async function startDraft(studyId: string, userId: string): Promise<{ id: string; number: number }> {
  await assertStudyOpen(studyId)
  const existing = await getDraft(studyId)
  if (existing) return { id: existing.id, number: existing.number }

  const published = await prisma.corelabCrfVersion.findFirst({
    where: { studyId, publishedAt: { not: null } },
    select: { number: true, definition: true, discordanceThresholds: true },
    orderBy: { number: 'desc' },
  })

  return prisma.corelabCrfVersion.create({
    data: {
      studyId,
      number: (published?.number ?? 0) + 1,
      definition: published?.definition ?? toJsonValue([]),
      discordanceThresholds: published?.discordanceThresholds ?? toJsonValue([]),
      publishedAt: null,
      publishedById: userId,
    },
    select: { id: true, number: true },
  })
}

export async function saveDraft(studyId: string, definition: unknown): Promise<void> {
  await assertStudyOpen(studyId)
  const draft = await prisma.corelabCrfVersion.findFirstOrThrow({
    where: { studyId, publishedAt: null },
    select: { id: true },
  })
  await prisma.corelabCrfVersion.update({
    where: { id: draft.id },
    data: { definition: toJsonValue(crfDefinitionSchema.parse(definition)) },
    select: { id: true },
  })
}

export type DraftImpact = { changes: VersionChange[]; worst: ReturnType<typeof worstImpact>; signedReadings: number }

export async function draftImpact(studyId: string): Promise<DraftImpact | null> {
  const draft = await getDraft(studyId)
  if (!draft) return null

  const signedReadings = await prisma.corelabReadingSubmission.count({
    where: { assignment: { patient: { studyId } } },
  })
  const changes = draft.basedOn ? diffVersions(draft.basedOn.definition, draft.definition) : []
  return { changes, worst: worstImpact(changes), signedReadings }
}

export async function publishDraft(studyId: string, userId: string): Promise<{ number: number }> {
  await assertStudyOpen(studyId)
  const draft = await getDraft(studyId)
  if (!draft) throw new Error('NO_DRAFT')
  if (draft.definition.length === 0) throw new Error('EMPTY_DEFINITION')

  const signedReadings = await prisma.corelabReadingSubmission.count({
    where: { assignment: { patient: { studyId } } },
  })
  if (draft.basedOn) assertLockedIdsKept(draft.basedOn.definition, draft.definition, signedReadings > 0)

  await prisma.corelabCrfVersion.update({
    where: { id: draft.id },
    data: { publishedAt: new Date(), publishedById: userId },
    select: { id: true },
  })
  return { number: draft.number }
}

export async function discardDraft(studyId: string): Promise<void> {
  const draft = await prisma.corelabCrfVersion.findFirst({
    where: { studyId, publishedAt: null },
    select: { id: true },
  })
  if (draft) await prisma.corelabCrfVersion.delete({ where: { id: draft.id } })
}
