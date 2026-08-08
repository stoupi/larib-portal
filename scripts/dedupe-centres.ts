import { prisma } from '@/lib/prisma'
import { guessCentre, normalizeCentreKey } from '@/lib/services/publications/centre-extract'
import { proposeCentreName } from '@/lib/services/publications/centre-resolve'
import { mergeCentres, renameCentre } from '@/lib/services/publications/centres'

type CentreRow = {
  id: string
  name: string
  city: string | null
  createdAt: Date
  _count: { authors: number; studies: number; affiliations: number; authorLinks: number; studyInvestigators: number }
}

// Names that read like a raw affiliation rather than a site. The script never rewrites
// them: guessing a better name for a lone centre produced nonsense such as
// "Department of Hospital Therapy No.2" -> "Therapy No.2 Hospital". They are only
// reported so a human decides.
const SUSPICIOUS_NAME = /^(?:the\s+)?(?:department|dept\.?|division|service)\b/i

const WEAK_KEY_TOKENS = 4

function canonicalNameOf(centre: CentreRow): string {
  return proposeCentreName({ rawName: centre.name, keepUnrecognisedName: true }) ?? centre.name
}

// Names where no hospital could be identified never share a canonical key, so they are
// grouped on their leading words instead: that is what pairs the AP-HP umbrella rows.
function weakKeyOf(centre: CentreRow): string | null {
  if (guessCentre(centre.name)) return null
  const tokens = normalizeCentreKey(centre.name).split(' ').filter(Boolean)
  return tokens.length >= 3 ? tokens.slice(0, WEAK_KEY_TOKENS).join(' ') : null
}

function keysOf(centre: CentreRow): string[] {
  const keys = [normalizeCentreKey(centre.name), normalizeCentreKey(canonicalNameOf(centre)), weakKeyOf(centre) ?? '']
  return [...new Set(keys.filter(Boolean))]
}

function groupBySharedKey(centres: CentreRow[]): CentreRow[][] {
  const groupIdByKey = new Map<string, number>()
  const parents: number[] = []
  const groupIdByCentre = new Map<string, number>()

  const find = (index: number): number => {
    let current = index
    while (parents[current] !== current) current = parents[current]
    return current
  }
  const union = (left: number, right: number) => {
    const [rootLeft, rootRight] = [find(left), find(right)]
    if (rootLeft !== rootRight) parents[rootRight] = rootLeft
  }

  for (const centre of centres) {
    const own = parents.length
    parents.push(own)
    groupIdByCentre.set(centre.id, own)
    for (const key of keysOf(centre)) {
      const seen = groupIdByKey.get(key)
      if (seen === undefined) groupIdByKey.set(key, own)
      else union(seen, own)
    }
  }

  const membersByRoot = new Map<number, CentreRow[]>()
  for (const centre of centres) {
    const root = find(groupIdByCentre.get(centre.id) as number)
    membersByRoot.set(root, [...(membersByRoot.get(root) ?? []), centre])
  }
  return [...membersByRoot.values()]
}

function linkCount(centre: CentreRow): number {
  return centre._count.authors + centre._count.studies + centre._count.affiliations + centre._count.authorLinks + centre._count.studyInvestigators
}

function isAlreadyCanonical(centre: CentreRow): number {
  return canonicalNameOf(centre) === centre.name ? 0 : 1
}

// Most attached data first, then the spelling the importers already agree on: keeping
// "Loyola University of Chicago," over "Loyola University of Chicago" would leave the
// trailing comma in every future match.
function pickSurvivor(group: CentreRow[]): CentreRow {
  return [...group].sort(
    (left, right) =>
      linkCount(right) - linkCount(left) ||
      isAlreadyCanonical(left) - isAlreadyCanonical(right) ||
      left.name.length - right.name.length ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  )[0]
}

// The survivor is chosen on attached data, which sometimes means keeping the sloppier
// spelling ("Loyola University of Chicago,"). When another member of the group already
// carries the canonical spelling, the survivor takes it over — an attested name, never
// an invented one.
function preferredNameFor(group: CentreRow[], survivor: CentreRow): string {
  if (isAlreadyCanonical(survivor) === 0) return survivor.name
  const attested = [...group]
    .sort((left, right) => linkCount(right) - linkCount(left))
    .find((centre) => isAlreadyCanonical(centre) === 0)
  return attested?.name ?? survivor.name
}

function describe(centre: CentreRow): string {
  return `"${centre.name}" [${centre.city ?? 'ville inconnue'}] (auteurs=${centre._count.authors} études=${centre._count.studies} affiliations=${centre._count.affiliations} liens=${linkCount(centre)})`
}

async function main() {
  const apply = process.argv.includes('--apply')
  const centres: CentreRow[] = await prisma.centre.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      city: true,
      createdAt: true,
      _count: { select: { authors: true, studies: true, affiliations: true, authorLinks: true, studyInvestigators: true } },
    },
  })

  const duplicateGroups = groupBySharedKey(centres).filter((group) => group.length > 1)
  const grouped = new Set(duplicateGroups.flat().map((centre) => centre.id))
  const suspiciousNames = centres.filter((centre) => SUSPICIOUS_NAME.test(centre.name) && !grouped.has(centre.id))

  console.log(`${centres.length} centres, ${duplicateGroups.length} groupes de doublons.\n`)

  for (const group of duplicateGroups) {
    const survivor = pickSurvivor(group)
    const preferred = preferredNameFor(group, survivor)
    console.log(`GARDER  ${describe(survivor)}`)
    if (preferred !== survivor.name) console.log(`  renommer en  "${preferred}"`)
    for (const loser of group.filter((centre) => centre.id !== survivor.id)) console.log(`  fusionner  ${describe(loser)}`)
    console.log('')
  }

  if (suspiciousNames.length > 0) {
    console.log('À RENOMMER À LA MAIN (aucun jumeau, donc rien à fusionner) :')
    for (const centre of suspiciousNames) console.log(`  ${describe(centre)}`)
    console.log('')
  }

  if (!apply) {
    console.log('Simulation uniquement. Relancer avec --apply pour exécuter.')
    return
  }

  for (const group of duplicateGroups) {
    const survivor = pickSurvivor(group)
    const losers = group.filter((centre) => centre.id !== survivor.id).map((centre) => centre.id)
    const result = await mergeCentres(survivor.id, losers)
    console.log(`fusionné vers "${survivor.name}" : ${result.deleted} supprimés, ${result.reassigned} affiliations, ${result.studiesMoved} études, ${result.aliasesKept} alias conservés`)
    const preferred = preferredNameFor(group, survivor)
    if (preferred !== survivor.name) {
      await renameCentre(survivor.id, preferred)
      console.log(`  renommé "${survivor.name}" -> "${preferred}"`)
    }
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
