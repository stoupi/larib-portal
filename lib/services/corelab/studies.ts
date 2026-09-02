import { prisma } from '@/lib/prisma'
import { parseCrfDefinition, discordanceThresholdsSchema, type DiscordanceThreshold } from '@/lib/corelab/crf/schema'
import { toJsonValue } from '@/lib/corelab/crf/json'
import type { CorelabStudyPhase, Prisma } from '@/app/generated/prisma'

export const CORELAB_STUDIES_TAG = 'corelab-studies'

const SUMMARY_SELECT = {
  id: true,
  code: true,
  name: true,
  phase: true,
  modalities: true,
  startedAt: true,
  closedAt: true,
  _count: { select: { memberships: true } },
} satisfies Prisma.CorelabStudySelect

export type StudySummary = Prisma.CorelabStudyGetPayload<{ select: typeof SUMMARY_SELECT }>

export async function listStudies(): Promise<StudySummary[]> {
  return prisma.corelabStudy.findMany({ select: SUMMARY_SELECT, orderBy: { createdAt: 'desc' } })
}

const MEMBER_STUDY_SELECT = {
  id: true,
  canRead: true,
  canAdjudicate: true,
  canAuthorReference: true,
  canCertify: true,
  certificationPhase: true,
  calibrationStatus: true,
  study: {
    select: { id: true, code: true, name: true, phase: true, modalities: true },
  },
} satisfies Prisma.CorelabStudyMembershipSelect

export type MemberStudy = Prisma.CorelabStudyMembershipGetPayload<{ select: typeof MEMBER_STUDY_SELECT }>

export async function listStudiesForUser(userId: string): Promise<MemberStudy[]> {
  return prisma.corelabStudyMembership.findMany({
    where: { userId, removedAt: null },
    select: MEMBER_STUDY_SELECT,
    orderBy: { joinedAt: 'asc' },
  })
}

const STUDY_DETAIL_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  phase: true,
  modalities: true,
  maxExamsPerPatient: true,
  reviewDeadlineDays: true,
  startedAt: true,
  closedAt: true,
  sites: { select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } },
  crfVersions: { select: { id: true, number: true, publishedAt: true }, orderBy: { number: 'desc' } },
} satisfies Prisma.CorelabStudySelect

export type StudyDetail = Prisma.CorelabStudyGetPayload<{ select: typeof STUDY_DETAIL_SELECT }>

export async function getStudy(studyId: string): Promise<StudyDetail | null> {
  return prisma.corelabStudy.findUnique({ where: { id: studyId }, select: STUDY_DETAIL_SELECT })
}

export type CurrentCrfVersion = {
  id: string
  number: number
  definition: ReturnType<typeof parseCrfDefinition>
  discordanceThresholds: DiscordanceThreshold[]
}

export async function getCurrentCrfVersion(studyId: string): Promise<CurrentCrfVersion | null> {
  const version = await prisma.corelabCrfVersion.findFirst({
    where: { studyId },
    orderBy: { number: 'desc' },
    select: { id: true, number: true, definition: true, discordanceThresholds: true },
  })
  if (!version) return null
  return {
    id: version.id,
    number: version.number,
    definition: parseCrfDefinition(version.definition),
    discordanceThresholds: discordanceThresholdsSchema.parse(version.discordanceThresholds),
  }
}

export type CreateStudyInput = {
  code: string
  name: string
  description: string
  maxExamsPerPatient: number
  reviewDeadlineDays: number
  createdById: string
}

export async function createStudy(input: CreateStudyInput): Promise<{ id: string; code: string }> {
  return prisma.corelabStudy.create({
    data: { ...input, modalities: ['CMR'] },
    select: { id: true, code: true },
  })
}

export type UpdateStudyInfoInput = {
  name: string
  description: string
  reviewDeadlineDays: number
  maxExamsPerPatient: number
}

export async function updateStudyInfo(studyId: string, input: UpdateStudyInfoInput): Promise<void> {
  await prisma.corelabStudy.update({ where: { id: studyId }, data: input, select: { id: true } })
}

export async function updateDiscordanceThresholds(
  crfVersionId: string,
  thresholds: DiscordanceThreshold[],
): Promise<void> {
  await prisma.corelabCrfVersion.update({
    where: { id: crfVersionId },
    data: { discordanceThresholds: toJsonValue(thresholds) },
    select: { id: true },
  })
}

type StudyClient = Pick<Prisma.TransactionClient, 'corelabStudy'>

export async function setStudyPhase(
  studyId: string,
  phase: CorelabStudyPhase,
  client: StudyClient = prisma,
): Promise<void> {
  await client.corelabStudy.update({
    where: { id: studyId },
    data: {
      phase,
      ...(phase === 'PRODUCTION' ? { startedAt: new Date() } : {}),
      ...(phase === 'CLOSED' ? { closedAt: new Date() } : {}),
    },
    select: { id: true },
  })
}
