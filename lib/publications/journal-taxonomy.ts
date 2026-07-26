export const JOURNAL_SPECIALTIES = [
  'CARDIOLOGY',
  'GENERAL_MEDICINE',
  'NEUROLOGY',
  'ONCOLOGY',
  'RADIOLOGY',
  'SURGERY',
] as const
export type JournalSpecialty = (typeof JOURNAL_SPECIALTIES)[number]

export const JOURNAL_SUB_SPECIALTIES = [
  'GENERAL',
  'IMAGING',
  'INTERVENTIONAL',
  'CARDIO_ONCOLOGY',
  'ELECTROPHYSIOLOGY',
  'HEART_FAILURE',
  'RHYTHMOLOGY',
  'NEURO_IMAGING',
  'ONCO_IMAGING',
  'SURGICAL_TECHNIQUES',
] as const
export type JournalSubSpecialty = (typeof JOURNAL_SUB_SPECIALTIES)[number]

const SUB_SPECIALTIES_BY_SPECIALTY: Record<JournalSpecialty, JournalSubSpecialty[]> = {
  CARDIOLOGY: ['GENERAL', 'IMAGING', 'INTERVENTIONAL', 'CARDIO_ONCOLOGY', 'ELECTROPHYSIOLOGY', 'HEART_FAILURE'],
  GENERAL_MEDICINE: ['GENERAL'],
  NEUROLOGY: ['GENERAL', 'NEURO_IMAGING', 'RHYTHMOLOGY'],
  ONCOLOGY: ['GENERAL', 'ONCO_IMAGING', 'CARDIO_ONCOLOGY'],
  RADIOLOGY: ['GENERAL', 'IMAGING', 'NEURO_IMAGING', 'ONCO_IMAGING'],
  SURGERY: ['GENERAL', 'INTERVENTIONAL', 'SURGICAL_TECHNIQUES'],
}

export function subSpecialtiesFor(specialty: JournalSpecialty | null): JournalSubSpecialty[] {
  if (!specialty) return []
  return SUB_SPECIALTIES_BY_SPECIALTY[specialty]
}

export function isJournalSpecialty(value: string | null): value is JournalSpecialty {
  return value != null && (JOURNAL_SPECIALTIES as readonly string[]).includes(value)
}

// Keeps a sub-specialty only when it belongs to the selected specialty, so switching
// specialty never leaves an orphan value behind.
export function keepSubSpecialty(
  specialty: JournalSpecialty | null,
  subSpecialty: string | null,
): JournalSubSpecialty | null {
  if (!specialty || !subSpecialty) return null
  const allowed = subSpecialtiesFor(specialty)
  return allowed.find((candidate) => candidate === subSpecialty) ?? null
}
