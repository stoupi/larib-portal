import { prisma } from '@/lib/prisma'
import { r2GetSignedDownloadUrl } from '@/lib/services/r2-s3'
import { canAdminApp } from '@/lib/permissions'
import { parseQuiz, toPublicQuiz, type PublicQuiz, type Quiz } from '@/lib/corelab/training/quiz-schema'
import { toJsonValue } from '@/lib/corelab/crf/json'
import {
  nextUnlockedModule, requiredModulesStatus, scoreQuiz, trainingComplete, type ModuleStatus,
} from '@/lib/corelab/training/progress'
import { Prisma } from '@/app/generated/prisma'
import type { CorelabTrainingModuleType, CorelabTrainingScope } from '@/app/generated/prisma'

const MODULE_SELECT = {
  id: true, scope: true, softwareName: true, studyId: true, order: true, title: true,
  description: true, type: true, durationMinutes: true, videoKey: true, passThreshold: true,
  version: true, archivedAt: true,
} satisfies Prisma.CorelabTrainingModuleSelect

export type TrainingModuleSummary = Prisma.CorelabTrainingModuleGetPayload<{ select: typeof MODULE_SELECT }>

export async function listModules(): Promise<TrainingModuleSummary[]> {
  return prisma.corelabTrainingModule.findMany({
    where: { archivedAt: null },
    select: MODULE_SELECT,
    orderBy: [{ scope: 'asc' }, { order: 'asc' }],
  })
}

export async function listModulesForStudyAdmin(studyId: string): Promise<{
  requirements: Array<{ moduleId: string; order: number }>
  available: TrainingModuleSummary[]
}> {
  const [requirements, available] = await Promise.all([
    prisma.corelabStudyTrainingRequirement.findMany({
      where: { studyId },
      select: { moduleId: true, order: true },
      orderBy: { order: 'asc' },
    }),
    prisma.corelabTrainingModule.findMany({
      where: { archivedAt: null, OR: [{ scope: { in: ['CORE', 'SOFTWARE'] } }, { studyId }] },
      select: MODULE_SELECT,
      orderBy: [{ scope: 'asc' }, { order: 'asc' }],
    }),
  ])
  return { requirements, available }
}

async function statusForStudy(studyId: string, userId: string): Promise<ModuleStatus[]> {
  const [requirements, completions] = await Promise.all([
    prisma.corelabStudyTrainingRequirement.findMany({
      where: { studyId },
      select: { order: true, module: { select: { id: true, version: true, scope: true, title: true, type: true } } },
      orderBy: { order: 'asc' },
    }),
    prisma.corelabTrainingCompletion.findMany({ where: { userId }, select: { moduleId: true, moduleVersion: true } }),
  ])
  return requiredModulesStatus(
    requirements.map((requirement) => ({ module: { ...requirement.module, order: requirement.order } })),
    completions,
  )
}

export type StudyTraining = {
  studyId: string
  studyCode: string
  studyName: string
  trainingDueAt: Date | null
  certificationPhase: string
  modules: ModuleStatus[]
  complete: boolean
  nextModuleId: string | null
}

export async function getStudyTraining(studyId: string, userId: string): Promise<StudyTraining | null> {
  const membership = await prisma.corelabStudyMembership.findFirst({
    where: { studyId, userId, removedAt: null },
    select: {
      trainingDueAt: true,
      certificationPhase: true,
      study: { select: { id: true, code: true, name: true } },
    },
  })
  if (!membership) return null
  const modules = await statusForStudy(studyId, userId)
  return {
    studyId: membership.study.id,
    studyCode: membership.study.code,
    studyName: membership.study.name,
    trainingDueAt: membership.trainingDueAt,
    certificationPhase: membership.certificationPhase,
    modules,
    complete: trainingComplete(modules),
    nextModuleId: nextUnlockedModule(modules),
  }
}

export async function listMyTraining(userId: string): Promise<StudyTraining[]> {
  const memberships = await prisma.corelabStudyMembership.findMany({
    where: { userId, removedAt: null },
    select: { studyId: true },
    orderBy: { joinedAt: 'asc' },
  })
  const trainings = await Promise.all(memberships.map((membership) => getStudyTraining(membership.studyId, userId)))
  return trainings.filter((training): training is StudyTraining => training !== null)
}

export type ReaderModule = {
  id: string
  title: string
  description: string
  type: CorelabTrainingModuleType
  scope: CorelabTrainingScope
  durationMinutes: number
  hasVideo: boolean
  quiz: PublicQuiz | null
  completed: boolean
}

async function moduleIsRequiredForUser(moduleId: string, userId: string): Promise<boolean> {
  const requirement = await prisma.corelabStudyTrainingRequirement.findFirst({
    where: { moduleId, study: { memberships: { some: { userId, removedAt: null } } } },
    select: { id: true },
  })
  return requirement !== null
}

export async function getModuleForReader(moduleId: string, userId: string): Promise<ReaderModule | null> {
  if (!(await moduleIsRequiredForUser(moduleId, userId))) return null
  const trainingModule = await prisma.corelabTrainingModule.findUnique({
    where: { id: moduleId },
    select: { ...MODULE_SELECT, quiz: true },
  })
  if (!trainingModule || trainingModule.archivedAt) return null
  const completion = await prisma.corelabTrainingCompletion.findUnique({
    where: { userId_moduleId: { userId, moduleId } },
    select: { moduleVersion: true },
  })
  return {
    id: trainingModule.id,
    title: trainingModule.title,
    description: trainingModule.description,
    type: trainingModule.type,
    scope: trainingModule.scope,
    durationMinutes: trainingModule.durationMinutes,
    hasVideo: Boolean(trainingModule.videoKey),
    quiz: trainingModule.quiz ? toPublicQuiz(parseQuiz(trainingModule.quiz)) : null,
    completed: completion?.moduleVersion === trainingModule.version,
  }
}

export async function getTrainingVideoUrl(
  moduleId: string,
  user: { id: string; role?: string | null; applications?: unknown; adminApplications?: unknown },
): Promise<string | null> {
  const trainingModule = await prisma.corelabTrainingModule.findUnique({
    where: { id: moduleId },
    select: { videoKey: true },
  })
  if (!trainingModule?.videoKey) return null
  const isAdmin = canAdminApp(user as Parameters<typeof canAdminApp>[0], 'CORELAB')
  if (!isAdmin && !(await moduleIsRequiredForUser(moduleId, user.id))) return null
  return r2GetSignedDownloadUrl(trainingModule.videoKey)
}

export type CreateModuleInput = {
  scope: CorelabTrainingScope
  softwareName: string | null
  studyId: string | null
  order: number
  title: string
  description: string
  type: CorelabTrainingModuleType
  durationMinutes: number
  passThreshold: number | null
  quiz: Quiz | null
}

export async function createModule(input: CreateModuleInput): Promise<{ id: string }> {
  return prisma.corelabTrainingModule.create({
    data: { ...input, quiz: input.quiz ? toJsonValue(input.quiz) : undefined },
    select: { id: true },
  })
}

export async function updateModule(moduleId: string, input: Partial<CreateModuleInput>): Promise<void> {
  const current = await prisma.corelabTrainingModule.findUniqueOrThrow({
    where: { id: moduleId },
    select: { quiz: true, version: true },
  })
  const quizChanged = input.quiz !== undefined && JSON.stringify(input.quiz) !== JSON.stringify(current.quiz)
  await prisma.corelabTrainingModule.update({
    where: { id: moduleId },
    data: {
      ...input,
      quiz: input.quiz === undefined ? undefined : input.quiz === null ? Prisma.DbNull : toJsonValue(input.quiz),
      version: quizChanged ? current.version + 1 : undefined,
    },
    select: { id: true },
  })
}

export async function setModuleVideo(
  moduleId: string,
  video: { key: string; mimeType: string; size: number },
): Promise<void> {
  const current = await prisma.corelabTrainingModule.findUniqueOrThrow({
    where: { id: moduleId },
    select: { videoKey: true, version: true },
  })
  await prisma.corelabTrainingModule.update({
    where: { id: moduleId },
    data: {
      videoKey: video.key,
      videoMimeType: video.mimeType,
      videoSize: video.size,
      version: current.videoKey === video.key ? undefined : current.version + 1,
    },
    select: { id: true },
  })
}

export async function archiveModule(moduleId: string): Promise<void> {
  await prisma.corelabTrainingModule.update({
    where: { id: moduleId },
    data: { archivedAt: new Date() },
    select: { id: true },
  })
}

export async function setStudyRequirements(studyId: string, moduleIds: string[]): Promise<void> {
  await prisma.$transaction([
    prisma.corelabStudyTrainingRequirement.deleteMany({ where: { studyId, moduleId: { notIn: moduleIds } } }),
    ...moduleIds.map((moduleId, index) =>
      prisma.corelabStudyTrainingRequirement.upsert({
        where: { studyId_moduleId: { studyId, moduleId } },
        create: { studyId, moduleId, order: index + 1 },
        update: { order: index + 1 },
        select: { id: true },
      }),
    ),
  ])
}

export async function completeVideoModule(userId: string, moduleId: string): Promise<void> {
  const trainingModule = await prisma.corelabTrainingModule.findUniqueOrThrow({
    where: { id: moduleId },
    select: { version: true, type: true },
  })
  if (trainingModule.type !== 'VIDEO') throw new Error('NOT_A_VIDEO_MODULE')
  const existing = await prisma.corelabTrainingCompletion.findUnique({
    where: { userId_moduleId: { userId, moduleId } },
    select: { id: true },
  })
  if (existing) {
    await prisma.corelabTrainingCompletion.update({
      where: { id: existing.id },
      data: { moduleVersion: trainingModule.version, completedAt: new Date() },
      select: { id: true },
    })
    return
  }
  await prisma.corelabTrainingCompletion.create({
    data: { userId, moduleId, moduleVersion: trainingModule.version },
    select: { id: true },
  })
}

export async function submitQuiz(
  userId: string,
  moduleId: string,
  answers: Record<string, string>,
): Promise<{ score: number; passed: boolean; correct: number; total: number }> {
  const trainingModule = await prisma.corelabTrainingModule.findUniqueOrThrow({
    where: { id: moduleId },
    select: { version: true, quiz: true, passThreshold: true },
  })
  if (!trainingModule.quiz) throw new Error('NOT_A_QUIZ_MODULE')
  const result = scoreQuiz(parseQuiz(trainingModule.quiz), answers, trainingModule.passThreshold)
  if (!result.passed) return result

  const existing = await prisma.corelabTrainingCompletion.findUnique({
    where: { userId_moduleId: { userId, moduleId } },
    select: { id: true },
  })
  if (existing) {
    await prisma.corelabTrainingCompletion.update({
      where: { id: existing.id },
      data: { moduleVersion: trainingModule.version, score: result.score, completedAt: new Date() },
      select: { id: true },
    })
  } else {
    await prisma.corelabTrainingCompletion.create({
      data: { userId, moduleId, moduleVersion: trainingModule.version, score: result.score },
      select: { id: true },
    })
  }
  return result
}

export async function unlockCalibrationIfTrained(studyId: string, userId: string): Promise<boolean> {
  const membership = await prisma.corelabStudyMembership.findFirst({
    where: { studyId, userId, removedAt: null },
    select: { id: true, certificationPhase: true },
  })
  if (!membership || membership.certificationPhase !== 'TRAINING') return false
  const modules = await statusForStudy(studyId, userId)
  if (!trainingComplete(modules)) return false
  await prisma.corelabStudyMembership.update({
    where: { id: membership.id },
    data: { certificationPhase: 'CALIBRATION' },
    select: { id: true },
  })
  return true
}
