import { sequenceCompletion } from '@/lib/corelab/crf/values'
import type { CrfDefinition, DocumentSlot } from '@/lib/corelab/crf/schema'
import type { ExamValues } from '@/types/corelab'

export type ReadinessDocument = { examId: string | null; slotKey: string; status: string }

export type ReadinessInput = {
  definition: CrfDefinition
  exams: Array<{ id: string; values: ExamValues }>
  slots: Array<Pick<DocumentSlot, 'id' | 'label' | 'accept' | 'required'>>
  documents: ReadinessDocument[]
  openFlags: number
}

export type ExamReadiness = {
  examId: string
  required: number
  filled: number
  missingFields: string[]
  missingDocuments: string[]
}

export type Readiness = { canSign: boolean; openFlags: number; exams: ExamReadiness[] }

export function readinessOf(input: ReadinessInput): Readiness {
  const requiredSlots = input.slots.filter((slot) => slot.required)

  const exams = input.exams.map((exam): ExamReadiness => {
    const perSequence = input.definition.map((sequence) => ({
      sequence,
      completion: sequenceCompletion(sequence, exam.values[sequence.id] ?? {}),
    }))

    const missingDocuments = requiredSlots
      .filter((slot) => !input.documents.some(
        (document) =>
          document.slotKey === slot.id &&
          document.status === 'CONFORMANT' &&
          (document.examId === null || document.examId === exam.id),
      ))
      .map((slot) => slot.id)

    return {
      examId: exam.id,
      required: perSequence.reduce((total, entry) => total + entry.completion.required, 0),
      filled: perSequence.reduce((total, entry) => total + entry.completion.filled, 0),
      missingFields: perSequence.flatMap((entry) =>
        entry.completion.missing.map((fieldId) => `${entry.sequence.id}.${fieldId}`),
      ),
      missingDocuments,
    }
  })

  return {
    canSign: exams.every((exam) => exam.missingFields.length === 0 && exam.missingDocuments.length === 0),
    openFlags: input.openFlags,
    exams,
  }
}
