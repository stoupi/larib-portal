import { describe, expect, it } from 'vitest'
import { nextUnlockedModule, requiredModulesStatus, scoreQuiz, trainingComplete } from './progress'
import type { Quiz } from './quiz-schema'

const requirements = [
  { module: { id: 'core-1', version: 1, scope: 'CORE' as const, title: 'Core lab basics', type: 'VIDEO' as const, order: 1 } },
  { module: { id: 'soft-1', version: 2, scope: 'SOFTWARE' as const, title: 'CVI42', type: 'VIDEO' as const, order: 2 } },
  { module: { id: 'study-1', version: 1, scope: 'STUDY' as const, title: 'MIR-Dijon protocol', type: 'QUIZ' as const, order: 3 } },
]

describe('requiredModulesStatus', () => {
  it('recognises a core module already completed for another study', () => {
    const status = requiredModulesStatus(requirements, [{ moduleId: 'core-1', moduleVersion: 1 }])
    expect(status[0]).toMatchObject({ moduleId: 'core-1', completed: true, recognisedFromElsewhere: true })
    expect(status[2]).toMatchObject({ moduleId: 'study-1', completed: false, recognisedFromElsewhere: false })
  })
  it('does not credit a completion of an older version', () => {
    const status = requiredModulesStatus(requirements, [{ moduleId: 'soft-1', moduleVersion: 1 }])
    expect(status[1].completed).toBe(false)
  })
  it('never marks a study module as recognised from elsewhere', () => {
    const status = requiredModulesStatus(requirements, [{ moduleId: 'study-1', moduleVersion: 1 }])
    expect(status[2]).toMatchObject({ completed: true, recognisedFromElsewhere: false })
  })
})

describe('trainingComplete', () => {
  it('is true only once every required module is done', () => {
    const completions = requirements.map((requirement) => ({ moduleId: requirement.module.id, moduleVersion: requirement.module.version }))
    expect(trainingComplete(requiredModulesStatus(requirements, completions))).toBe(true)
    expect(trainingComplete(requiredModulesStatus(requirements, completions.slice(0, 2)))).toBe(false)
  })
  it('is true when nothing is required', () => {
    expect(trainingComplete([])).toBe(true)
  })
})

describe('nextUnlockedModule', () => {
  it('opens the first module still to do, and nothing once all are done', () => {
    expect(nextUnlockedModule(requiredModulesStatus(requirements, []))).toBe('core-1')
    expect(nextUnlockedModule(requiredModulesStatus(requirements, [{ moduleId: 'core-1', moduleVersion: 1 }]))).toBe('soft-1')
    const all = requirements.map((requirement) => ({ moduleId: requirement.module.id, moduleVersion: requirement.module.version }))
    expect(nextUnlockedModule(requiredModulesStatus(requirements, all))).toBeNull()
  })
})

const quiz: Quiz = {
  questions: Array.from({ length: 8 }, (unused, index) => ({
    id: `q${index + 1}`,
    prompt: `Question ${index + 1}`,
    choices: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    correctChoiceId: 'a',
  })),
}

describe('scoreQuiz', () => {
  it('passes at seven right answers out of eight with a threshold of eighty', () => {
    const answers = Object.fromEntries(quiz.questions.map((question, index) => [question.id, index === 7 ? 'b' : 'a']))
    expect(scoreQuiz(quiz, answers, 80)).toEqual({ score: 88, passed: true, correct: 7, total: 8 })
  })
  it('fails at six right answers out of eight', () => {
    const answers = Object.fromEntries(quiz.questions.map((question, index) => [question.id, index >= 6 ? 'b' : 'a']))
    expect(scoreQuiz(quiz, answers, 80)).toEqual({ score: 75, passed: false, correct: 6, total: 8 })
  })
  it('defaults to a threshold of eighty and counts a missing answer as wrong', () => {
    expect(scoreQuiz(quiz, {}, null)).toEqual({ score: 0, passed: false, correct: 0, total: 8 })
  })
})
