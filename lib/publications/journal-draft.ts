import {
  isJournalSpecialty,
  keepSubSpecialty,
  type JournalSpecialty,
  type JournalSubSpecialty,
} from './journal-taxonomy'

export type JournalDraft = {
  issn: string
  name: string
  abbreviation: string
  publisher: string
  url: string
  specialty: JournalSpecialty | null
  subSpecialty: JournalSubSpecialty | null
  openAccess: boolean
  impactFactor: string
  sjr: string
  typicalDelayDays: string
}

export type JournalDraftSource = {
  name: string
  abbreviation: string | null
  issn: string | null
  publisher: string | null
  url: string | null
  impactFactor: number | null
  sjr: number | null
  specialty: string | null
  subSpecialty: string | null
  openAccess: boolean
  typicalDelayDays: number | null
}

export type JournalDraftPayload = {
  name: string
  abbreviation: string | null
  issn: string | null
  publisher: string | null
  url: string | null
  impactFactor: number | null
  sjr: number | null
  specialty: JournalSpecialty | null
  subSpecialty: JournalSubSpecialty | null
  openAccess: boolean
  typicalDelayDays: number | null
}

export const EMPTY_JOURNAL_DRAFT: JournalDraft = {
  issn: '',
  name: '',
  abbreviation: '',
  publisher: '',
  url: '',
  specialty: 'CARDIOLOGY',
  subSpecialty: 'GENERAL',
  openAccess: false,
  impactFactor: '',
  sjr: '',
  typicalDelayDays: '',
}

export function draftNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function draftText(value: number | null): string {
  return value == null ? '' : String(value)
}

export function journalToDraft(journal: JournalDraftSource): JournalDraft {
  const specialty = isJournalSpecialty(journal.specialty) ? journal.specialty : null
  return {
    issn: journal.issn ?? '',
    name: journal.name,
    abbreviation: journal.abbreviation ?? '',
    publisher: journal.publisher ?? '',
    url: journal.url ?? '',
    specialty,
    subSpecialty: keepSubSpecialty(specialty, journal.subSpecialty),
    openAccess: journal.openAccess,
    impactFactor: draftText(journal.impactFactor),
    sjr: draftText(journal.sjr),
    typicalDelayDays: draftText(journal.typicalDelayDays),
  }
}

export function draftToPayload(draft: JournalDraft): JournalDraftPayload {
  return {
    name: draft.name.trim(),
    abbreviation: draft.abbreviation.trim() || null,
    issn: draft.issn.trim() || null,
    publisher: draft.publisher.trim() || null,
    url: draft.url.trim() || null,
    impactFactor: draftNumber(draft.impactFactor),
    sjr: draftNumber(draft.sjr),
    specialty: draft.specialty,
    subSpecialty: keepSubSpecialty(draft.specialty, draft.subSpecialty),
    openAccess: draft.openAccess,
    typicalDelayDays: draftNumber(draft.typicalDelayDays),
  }
}

export function withSpecialty(draft: JournalDraft, specialty: JournalSpecialty): JournalDraft {
  return { ...draft, specialty, subSpecialty: keepSubSpecialty(specialty, draft.subSpecialty) ?? 'GENERAL' }
}
