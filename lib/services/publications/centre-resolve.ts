import { Prisma } from '@/app/generated/prisma'
import { cleanCentreName, guessCentre, normalizeCentreKey } from './centre-extract'

type Tx = Prisma.TransactionClient

export type CentreIndex = {
  idByKey: Map<string, string>
  nameById: Map<string, string>
}

export async function loadCentreIndex(tx: Tx): Promise<CentreIndex> {
  const [centres, aliases] = await Promise.all([
    tx.centre.findMany({ select: { id: true, name: true } }),
    tx.centreAlias.findMany({ select: { centreId: true, normalized: true } }),
  ])
  const idByKey = new Map<string, string>()
  const nameById = new Map<string, string>()
  for (const centre of centres) {
    nameById.set(centre.id, centre.name)
    const key = normalizeCentreKey(centre.name)
    if (key && !idByKey.has(key)) idByKey.set(key, centre.id)
  }
  for (const alias of aliases) {
    if (alias.normalized && !idByKey.has(alias.normalized)) idByKey.set(alias.normalized, alias.centreId)
  }
  return { idByKey, nameById }
}

export type CentreLookup = {
  rawName: string
  city?: string | null
  country?: string | null
  // A trial site is a centre by definition, so an unrecognised facility keeps its own
  // name — even an umbrella like AP-HP, which is the only site the trial declares.
  // An affiliation only yields a centre when a hospital could be identified in it.
  keepUnrecognisedName: boolean
  // An admin who corrected the automatic match by hand wins over the guess, and the raw
  // spelling becomes an alias so the same site resolves on its own next time.
  overrideCentreId?: string | null
}

export type CentreResolution = { centreId: string; name: string; created: boolean }

export function proposeCentreName(lookup: Pick<CentreLookup, 'rawName' | 'keepUnrecognisedName'>): string | null {
  const raw = lookup.rawName.trim()
  if (!raw) return null
  const guessed = guessCentre(raw)
  if (guessed) return guessed
  if (!lookup.keepUnrecognisedName) return null
  const cleaned = cleanCentreName(raw)
  return cleaned.length > 0 ? cleaned : null
}

export function findCentreInIndex(index: CentreIndex, name: string): string | null {
  const key = normalizeCentreKey(name)
  return key ? index.idByKey.get(key) ?? null : null
}

function rememberInIndex(index: CentreIndex, centreId: string, name: string): void {
  index.nameById.set(centreId, name)
  const key = normalizeCentreKey(name)
  if (key) index.idByKey.set(key, centreId)
}

async function fillMissingLocation(tx: Tx, centreId: string, lookup: CentreLookup): Promise<void> {
  if (!lookup.city && !lookup.country) return
  const centre = await tx.centre.findUnique({ where: { id: centreId }, select: { city: true, country: true } })
  if (!centre) return
  if (centre.city && centre.country) return
  await tx.centre.update({
    where: { id: centreId },
    data: { city: centre.city ?? lookup.city ?? null, country: centre.country ?? lookup.country ?? null },
  })
}

// The single place allowed to create a Centre from imported text. Everything else
// resolves through here, so one spelling of a site can only ever produce one centre.
export async function resolveCentre(tx: Tx, index: CentreIndex, lookup: CentreLookup): Promise<CentreResolution | null> {
  if (lookup.overrideCentreId) {
    const chosen = await tx.centre.findUnique({ where: { id: lookup.overrideCentreId }, select: { id: true, name: true } })
    if (chosen) {
      await fillMissingLocation(tx, chosen.id, lookup)
      await rememberCentreAlias(tx, chosen.id, lookup.rawName)
      rememberInIndex(index, chosen.id, chosen.name)
      const rawKey = normalizeCentreKey(lookup.rawName)
      if (rawKey) index.idByKey.set(rawKey, chosen.id)
      return { centreId: chosen.id, name: chosen.name, created: false }
    }
  }

  const proposed = proposeCentreName(lookup)
  if (!proposed) return null

  const existingId = findCentreInIndex(index, proposed) ?? findCentreInIndex(index, lookup.rawName)
  if (existingId) {
    await fillMissingLocation(tx, existingId, lookup)
    return { centreId: existingId, name: index.nameById.get(existingId) ?? proposed, created: false }
  }

  try {
    const created = await tx.centre.create({
      data: { name: proposed, city: lookup.city ?? null, country: lookup.country ?? null },
      select: { id: true, name: true },
    })
    rememberInIndex(index, created.id, created.name)
    return { centreId: created.id, name: created.name, created: true }
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
    const concurrent = await tx.centre.findFirst({ where: { name: proposed }, select: { id: true, name: true } })
    if (!concurrent) throw error
    rememberInIndex(index, concurrent.id, concurrent.name)
    return { centreId: concurrent.id, name: concurrent.name, created: false }
  }
}

export type CentrePreview = { rawName: string; resolvedName: string; status: 'existing' | 'new'; centreId: string | null }

// Read-only counterpart of resolveCentre, so an admin sees which sites will be attached
// to a centre that already exists and which ones are about to create one.
export async function previewCentreResolutions(tx: Tx, rawNames: string[]): Promise<CentrePreview[]> {
  const index = await loadCentreIndex(tx)
  return rawNames.map((rawName) => {
    const proposed = proposeCentreName({ rawName, keepUnrecognisedName: true }) ?? rawName
    const existingId = findCentreInIndex(index, proposed) ?? findCentreInIndex(index, rawName)
    if (existingId) return { rawName, resolvedName: index.nameById.get(existingId) ?? proposed, status: 'existing' as const, centreId: existingId }
    return { rawName, resolvedName: proposed, status: 'new' as const, centreId: null }
  })
}

export async function rememberCentreAlias(tx: Tx, centreId: string, alias: string): Promise<boolean> {
  const trimmed = alias.trim()
  const normalized = normalizeCentreKey(trimmed)
  if (!trimmed || !normalized) return false
  const centre = await tx.centre.findUnique({ where: { id: centreId }, select: { name: true } })
  if (!centre || normalizeCentreKey(centre.name) === normalized) return false
  const taken = await tx.centreAlias.findUnique({ where: { normalized }, select: { id: true } })
  if (taken) return false
  await tx.centreAlias.create({ data: { centreId, alias: trimmed, normalized } })
  return true
}
