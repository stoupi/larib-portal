export type AssignableMember = {
  userId: string
  canRead: boolean
  canAdjudicate: boolean
  canAuthorReference: boolean
  certificationPhase: 'TRAINING' | 'CALIBRATION' | 'PRODUCTION'
}

export type DraftAssignment = {
  readingMode: 'SINGLE' | 'DOUBLE'
  reader1?: string
  reader2?: string
  reviewer?: string
}

export function pairKey(userA: string, userB: string): string {
  return [userA, userB].sort().join('|')
}

export function pairDistribution(
  patients: Array<{ readers: string[]; examCount: number }>,
): Array<{ pair: string; patients: number; exams: number }> {
  const counts = new Map<string, { patients: number; exams: number }>()
  for (const patient of patients) {
    if (patient.readers.length < 2) continue
    const key = pairKey(patient.readers[0], patient.readers[1])
    const current = counts.get(key) ?? { patients: 0, exams: 0 }
    counts.set(key, { patients: current.patients + 1, exams: current.exams + patient.examCount })
  }
  return [...counts.entries()]
    .map(([pair, value]) => ({ pair, ...value }))
    .sort((left, right) => left.patients - right.patients || left.pair.localeCompare(right.pair))
}

export function readerCandidates(members: AssignableMember[]): AssignableMember[] {
  return members.filter((member) => member.canRead && member.certificationPhase === 'PRODUCTION')
}

export function reviewerCandidates(members: AssignableMember[], patientReaders: string[]): AssignableMember[] {
  return members.filter(
    (member) =>
      member.certificationPhase === 'PRODUCTION' &&
      (member.canAdjudicate || member.canAuthorReference) &&
      !patientReaders.includes(member.userId),
  )
}

const DAY = 24 * 60 * 60 * 1000

export function computePace(
  patientCount: number,
  dueDate: Date,
  from: Date,
): { amount: number; unit: 'week' | 'month' } {
  const days = Math.max(1, Math.ceil((dueDate.getTime() - from.getTime()) / DAY))
  const weeks = days / 7
  if (weeks <= 8) return { amount: Math.max(1, Math.round(patientCount / Math.max(1, weeks))), unit: 'week' }
  const months = days / 30
  return { amount: Math.max(1, Math.round(patientCount / Math.max(1, months))), unit: 'month' }
}

export function canValidateDraft(draft: DraftAssignment): boolean {
  if (!draft.reader1) return false
  if (draft.readingMode === 'DOUBLE') {
    if (!draft.reader2 || draft.reader2 === draft.reader1) return false
  }
  const readers = [draft.reader1, draft.reader2].filter(Boolean)
  return !draft.reviewer || !readers.includes(draft.reviewer)
}
