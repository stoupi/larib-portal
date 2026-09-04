import type { CorelabStudyPhase } from '@/app/generated/prisma'

const NEXT_PHASES: Readonly<Record<CorelabStudyPhase, CorelabStudyPhase[]>> = {
  DRAFT: ['RUN_IN'],
  RUN_IN: ['PRODUCTION'],
  PRODUCTION: ['CLOSED'],
  CLOSED: [],
}

export function allowedNextPhases(phase: CorelabStudyPhase): CorelabStudyPhase[] {
  return NEXT_PHASES[phase]
}

export function assertStudyWritable(phase: CorelabStudyPhase): void {
  if (phase === 'CLOSED') throw new Error('STUDY_CLOSED')
}
