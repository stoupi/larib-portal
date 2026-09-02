import { describe, expect, it } from 'vitest'
import { quizSchema, toPublicQuiz, parseQuiz } from './quiz-schema'

const quiz = {
  questions: [
    { id: 'q1', prompt: 'Which view?', choices: [{ id: 'a', label: 'SAX' }, { id: 'b', label: '4CH' }], correctChoiceId: 'b', explanation: 'four chambers' },
  ],
}

describe('quizSchema', () => {
  it('accepts a well-formed quiz', () => {
    expect(quizSchema.safeParse(quiz).success).toBe(true)
  })
  it('refuses a correct answer that is not one of the choices', () => {
    expect(quizSchema.safeParse({ questions: [{ ...quiz.questions[0], correctChoiceId: 'zz' }] }).success).toBe(false)
  })
  it('refuses a question with a single choice', () => {
    expect(quizSchema.safeParse({ questions: [{ ...quiz.questions[0], choices: [{ id: 'a', label: 'SAX' }], correctChoiceId: 'a' }] }).success).toBe(false)
  })
})

describe('toPublicQuiz', () => {
  it('never lets the answer reach the reader', () => {
    const publicQuiz = toPublicQuiz(parseQuiz(quiz))
    expect(JSON.stringify(publicQuiz)).not.toContain('correctChoiceId')
    expect(JSON.stringify(publicQuiz)).not.toContain('four chambers')
    expect(publicQuiz.questions[0].choices).toHaveLength(2)
  })
})
