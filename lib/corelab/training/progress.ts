import type { Quiz } from './quiz-schema'

export type TrainingScope = 'CORE' | 'SOFTWARE' | 'STUDY'
export type TrainingModuleType = 'VIDEO' | 'QUIZ'

export type RequirementInput = {
  module: { id: string; version: number; scope: TrainingScope; title: string; type: TrainingModuleType; order: number }
}
export type CompletionInput = { moduleId: string; moduleVersion: number }

export type ModuleStatus = {
  moduleId: string
  title: string
  scope: TrainingScope
  type: TrainingModuleType
  order: number
  completed: boolean
  recognisedFromElsewhere: boolean
}

export const DEFAULT_PASS_THRESHOLD = 80

export function requiredModulesStatus(
  requirements: RequirementInput[],
  completions: CompletionInput[],
): ModuleStatus[] {
  return [...requirements]
    .sort((left, right) => left.module.order - right.module.order)
    .map(({ module }) => {
      const completed = completions.some(
        (completion) => completion.moduleId === module.id && completion.moduleVersion === module.version,
      )
      return {
        moduleId: module.id,
        title: module.title,
        scope: module.scope,
        type: module.type,
        order: module.order,
        completed,
        recognisedFromElsewhere: completed && module.scope !== 'STUDY',
      }
    })
}

export function trainingComplete(status: ModuleStatus[]): boolean {
  return status.every((module) => module.completed)
}

export function nextUnlockedModule(status: ModuleStatus[]): string | null {
  return status.find((module) => !module.completed)?.moduleId ?? null
}

export function scoreQuiz(
  quiz: Quiz,
  answers: Record<string, string>,
  passThreshold: number | null,
): { score: number; passed: boolean; correct: number; total: number } {
  const total = quiz.questions.length
  const correct = quiz.questions.filter((question) => answers[question.id] === question.correctChoiceId).length
  const score = total === 0 ? 0 : Math.round((correct / total) * 100)
  return { score, passed: score >= (passThreshold ?? DEFAULT_PASS_THRESHOLD), correct, total }
}
