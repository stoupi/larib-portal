import { z } from 'zod'

export const quizChoiceSchema = z.object({ id: z.string().min(1), label: z.string().min(1) })

export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  choices: z.array(quizChoiceSchema).min(2),
  correctChoiceId: z.string().min(1),
  explanation: z.string().optional(),
}).superRefine((question, context) => {
  if (!question.choices.some((choice) => choice.id === question.correctChoiceId)) {
    context.addIssue({ code: 'custom', message: `${question.id}: correctChoiceId is not one of the choices`, path: ['correctChoiceId'] })
  }
})

export const quizSchema = z.object({ questions: z.array(quizQuestionSchema).min(1) })

export type QuizChoice = z.infer<typeof quizChoiceSchema>
export type QuizQuestion = z.infer<typeof quizQuestionSchema>
export type Quiz = z.infer<typeof quizSchema>
export type PublicQuizQuestion = Omit<QuizQuestion, 'correctChoiceId' | 'explanation'>
export type PublicQuiz = { questions: PublicQuizQuestion[] }

export function parseQuiz(value: unknown): Quiz {
  return quizSchema.parse(value)
}

export function toPublicQuiz(quiz: Quiz): PublicQuiz {
  return { questions: quiz.questions.map(({ id, prompt, choices }) => ({ id, prompt, choices })) }
}
