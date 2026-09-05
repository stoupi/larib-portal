export type PairPatient = { patientId: string; readerIds: string[]; examCount: number }
export type PairDecision = { patientId: string; level: 'OK' | 'MINOR' | 'MAJOR' | null }

export type PairStat = {
  pair: string
  readerIds: string[]
  exams: number
  compared: number
  discordantPercent: number
  majorPercent: number
}

export function pairStats(patients: PairPatient[], decisions: PairDecision[]): PairStat[] {
  const byPair = new Map<string, PairStat>()
  const pairOfPatient = new Map<string, string>()

  for (const patient of patients) {
    if (patient.readerIds.length < 2) continue
    const readerIds = [...patient.readerIds].sort()
    const key = readerIds.join('|')
    pairOfPatient.set(patient.patientId, key)
    const current = byPair.get(key) ?? { pair: key, readerIds, exams: 0, compared: 0, discordantPercent: 0, majorPercent: 0 }
    current.exams += patient.examCount
    byPair.set(key, current)
  }

  const counts = new Map<string, { compared: number; discordant: number; major: number }>()
  for (const decision of decisions) {
    if (!decision.level) continue
    const key = pairOfPatient.get(decision.patientId)
    if (!key) continue
    const current = counts.get(key) ?? { compared: 0, discordant: 0, major: 0 }
    current.compared += 1
    if (decision.level !== 'OK') current.discordant += 1
    if (decision.level === 'MAJOR') current.major += 1
    counts.set(key, current)
  }

  return [...byPair.values()].map((pair) => {
    const count = counts.get(pair.pair) ?? { compared: 0, discordant: 0, major: 0 }
    return {
      ...pair,
      compared: count.compared,
      discordantPercent: count.compared === 0 ? 0 : (count.discordant / count.compared) * 100,
      majorPercent: count.compared === 0 ? 0 : (count.major / count.compared) * 100,
    }
  })
}
