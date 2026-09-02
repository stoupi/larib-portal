'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/app/i18n/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { submitQuizAction } from '../../../actions-training'
import type { PublicQuiz } from '@/lib/corelab/training/quiz-schema'

type ModuleQuizProps = {
  studyId: string
  moduleId: string
  quiz: PublicQuiz
  passThreshold: number
}

export function ModuleQuiz({ studyId, moduleId, quiz, passThreshold }: ModuleQuizProps) {
  const t = useTranslations('corelab.training')
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null)

  const action = useAction(submitQuizAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      setResult({ score: data.score, passed: data.passed })
      if (data.passed) toast.success(data.unlocked ? t('unlocked') : t('quizPassed', { score: data.score }))
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        {t('quizIntro', { count: quiz.questions.length, threshold: passThreshold })}
      </p>

      {quiz.questions.map((question, index) => (
        <fieldset key={question.id} className="rounded-xl border border-border bg-white p-4">
          <legend className="px-1 text-sm font-medium text-text-primary">
            {index + 1}. {question.prompt}
          </legend>
          <div className="mt-2 space-y-1.5">
            {question.choices.map((choice) => (
              <label key={choice.id} className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="radio"
                  name={question.id}
                  value={choice.id}
                  checked={answers[question.id] === choice.id}
                  onChange={() => setAnswers((current) => ({ ...current, [question.id]: choice.id }))}
                />
                {choice.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {result ? (
        <p className={`text-sm ${result.passed ? 'text-emerald-700' : 'text-red-600'}`} data-testid="quiz-result">
          {result.passed
            ? t('quizPassed', { score: result.score })
            : t('quizFailed', { score: result.score, threshold: passThreshold })}
        </p>
      ) : null}

      <Button
        disabled={action.isPending || Object.keys(answers).length < quiz.questions.length}
        onClick={() => action.execute({ studyId, moduleId, answers })}
      >
        {result && !result.passed ? t('retry') : t('submitQuiz')}
      </Button>
    </div>
  )
}
