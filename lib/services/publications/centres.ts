import { prisma } from '@/lib/prisma'
import { Prisma, type AuthorType, type StudyStatus } from '@/app/generated/prisma'
import { rememberCentreAlias } from './centre-resolve'

export type CentreRow = {
  id: string
  name: string
  shortCode: string | null
  parentOrganisation: string | null
  city: string | null
  country: string | null
  isOwn: boolean
  authorsCount: number
  publicationsCount: number
  studiesCount: number
}

export async function listCentres(): Promise<CentreRow[]> {
  const [centres, authorCounts, pubRows] = await Promise.all([
    prisma.centre.findMany({ orderBy: [{ name: 'asc' }], select: { id: true, name: true, shortCode: true, parentOrganisation: true, city: true, country: true, isOwn: true, _count: { select: { studies: true } } } }),
    prisma.author.groupBy({ by: ['centreId'], _count: { _all: true }, where: { centreId: { not: null } } }),
    prisma.$queryRaw<{ centreId: string; cnt: bigint }[]>`
      SELECT a."centreId" AS "centreId", COUNT(DISTINCT ash."articleId") AS cnt
      FROM "Affiliation" a
      JOIN "AuthorshipAffiliation" aa ON aa."affiliationId" = a."id"
      JOIN "Authorship" ash ON ash."id" = aa."authorshipId"
      WHERE a."centreId" IS NOT NULL
      GROUP BY a."centreId"`,
  ])
  const authorMap = new Map(authorCounts.map((row) => [row.centreId, row._count._all]))
  const pubMap = new Map(pubRows.map((row) => [row.centreId, Number(row.cnt)]))
  return centres.map(({ _count, ...centre }) => ({
    ...centre,
    authorsCount: authorMap.get(centre.id) ?? 0,
    publicationsCount: pubMap.get(centre.id) ?? 0,
    studiesCount: _count.studies,
  }))
}

export type CentreStudy = {
  id: string
  title: string
  acronym: string | null
  nctId: string | null
  status: StudyStatus
  startDate: Date | null
  investigatorsCount: number
}

export async function getCentreStudies(centreId: string): Promise<CentreStudy[]> {
  const studies = await prisma.study.findMany({
    where: { centres: { some: { id: centreId } } },
    orderBy: [{ startDate: 'desc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      acronym: true,
      nctId: true,
      status: true,
      startDate: true,
      _count: { select: { investigators: true } },
    },
  })
  return studies.map(({ _count, ...study }) => ({ ...study, investigatorsCount: _count.investigators }))
}

export type CentreAuthor = {
  id: string
  firstName: string
  lastName: string
  degrees: string | null
  type: AuthorType
  publications: number
}

export async function getCentreAuthors(centreId: string): Promise<CentreAuthor[]> {
  const authors = await prisma.author.findMany({
    where: { centreId },
    orderBy: [{ authorships: { _count: 'desc' } }, { lastName: 'asc' }],
    select: { id: true, firstName: true, lastName: true, degrees: true, type: true, _count: { select: { authorships: true } } },
    take: 120,
  })
  return authors.map((author) => ({
    id: author.id,
    firstName: author.firstName,
    lastName: author.lastName,
    degrees: author.degrees,
    type: author.type,
    publications: author._count.authorships,
  }))
}

export type CentreIdentity = {
  id: string
  name: string
  shortCode: string | null
  parentOrganisation: string | null
  city: string | null
  country: string | null
  isOwn: boolean
}

const CENTRE_IDENTITY_SELECT = { id: true, name: true, shortCode: true, parentOrganisation: true, city: true, country: true, isOwn: true } as const

export async function listCentreOptions(): Promise<CentreIdentity[]> {
  return prisma.centre.findMany({ orderBy: [{ name: 'asc' }], select: CENTRE_IDENTITY_SELECT })
}

// Creating a centre from inside another form must never fail on a name that is already
// in the bank: the caller only wants a centre to attach, so an existing one is returned.
export async function createCentre(data: {
  name: string
  shortCode?: string | null
  parentOrganisation?: string | null
  city?: string | null
  country?: string | null
  isOwn?: boolean
}): Promise<{ centre: CentreIdentity; reused: boolean }> {
  const existing = await prisma.centre.findUnique({ where: { name: data.name }, select: CENTRE_IDENTITY_SELECT })
  if (existing) return { centre: existing, reused: true }
  try {
    const centre = await prisma.centre.create({
      data: {
        name: data.name,
        shortCode: data.shortCode ?? null,
        parentOrganisation: data.parentOrganisation ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
        isOwn: data.isOwn ?? false,
      },
      select: CENTRE_IDENTITY_SELECT,
    })
    return { centre, reused: false }
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
    const raced = await prisma.centre.findUniqueOrThrow({ where: { name: data.name }, select: CENTRE_IDENTITY_SELECT })
    return { centre: raced, reused: true }
  }
}

// A rename is how the bank drifted away from the names the importers produce, so the
// previous spelling is kept as an alias and keeps resolving onto this centre.
export async function renameCentre(id: string, name: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.centre.findUnique({ where: { id }, select: { name: true } })
    const updated = await tx.centre.update({ where: { id }, data: { name }, select: { id: true } })
    if (current && current.name !== name) await rememberCentreAlias(tx, id, current.name)
    return updated
  })
}

export async function updateCentre(data: { id: string; name: string; shortCode?: string | null; parentOrganisation?: string | null; city?: string | null; country?: string | null; isOwn?: boolean }) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.centre.findUnique({ where: { id: data.id }, select: { name: true } })
    const updated = await tx.centre.update({
      where: { id: data.id },
      data: {
        name: data.name,
        shortCode: data.shortCode ?? null,
        parentOrganisation: data.parentOrganisation ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
        isOwn: data.isOwn ?? false,
      },
      select: { id: true },
    })
    if (current && current.name !== data.name) await rememberCentreAlias(tx, data.id, current.name)
    return updated
  })
}

export async function setCentreOwn(id: string, isOwn: boolean) {
  return prisma.centre.update({ where: { id }, data: { isOwn }, select: { id: true } })
}

export async function deleteCentre(id: string) {
  return prisma.centre.delete({ where: { id }, select: { id: true } })
}

export async function mergeCentres(
  keepId: string,
  mergeIds: string[],
): Promise<{ reassigned: number; deleted: number; studiesMoved: number; authorsRetyped: number; aliasesKept: number }> {
  const sources = mergeIds.filter((id) => id !== keepId)
  if (sources.length === 0) return { reassigned: 0, deleted: 0, studiesMoved: 0, authorsRetyped: 0, aliasesKept: 0 }
  return prisma.$transaction(async (tx) => {
    // Without this the next import recreates the duplicate we are about to delete.
    const merged = await tx.centre.findMany({ where: { id: { in: sources } }, select: { name: true } })
    let aliasesKept = 0
    for (const source of merged) {
      if (await rememberCentreAlias(tx, keepId, source.name)) aliasesKept += 1
    }
    await tx.centreAlias.updateMany({ where: { centreId: { in: sources } }, data: { centreId: keepId } })

    const reassigned = (await tx.affiliation.updateMany({ where: { centreId: { in: sources } }, data: { centreId: keepId } })).count
    await tx.author.updateMany({ where: { centreId: { in: sources } }, data: { centreId: keepId } })

    // Studies link to centres through an implicit many-to-many, so deleting a source
    // would drop the row silently and leave the study short of a centre.
    const studies = await tx.study.findMany({
      where: { centres: { some: { id: { in: sources } } } },
      select: { id: true, centres: { select: { id: true } } },
    })
    for (const study of studies) {
      if (study.centres.some((centre) => centre.id === keepId)) continue
      await tx.study.update({ where: { id: study.id }, data: { centres: { connect: { id: keepId } } } })
    }

    // An author already linked to the survivor would collide on @@unique([authorId, centreId]).
    const keepLinks = await tx.authorCentre.findMany({ where: { centreId: keepId }, select: { authorId: true } })
    const alreadyLinked = keepLinks.map((link) => link.authorId)
    if (alreadyLinked.length > 0) {
      await tx.authorCentre.deleteMany({ where: { centreId: { in: sources }, authorId: { in: alreadyLinked } } })
    }
    const movedLinks = await tx.authorCentre.findMany({ where: { centreId: { in: sources } }, select: { authorId: true } })
    await tx.authorCentre.updateMany({ where: { centreId: { in: sources } }, data: { centreId: keepId } })

    await tx.centre.deleteMany({ where: { id: { in: sources } } })

    // Author.type is derived from the primary centre, so authors pulled onto the
    // survivor must be re-typed or they keep the type of a centre that no longer exists.
    const survivor = await tx.centre.findUnique({ where: { id: keepId }, select: { isOwn: true } })
    const movedAuthorIds = [...new Set(movedLinks.map((link) => link.authorId))]
    let authorsRetyped = 0
    if (movedAuthorIds.length > 0) {
      authorsRetyped = (
        await tx.author.updateMany({
          where: { id: { in: movedAuthorIds }, centreId: keepId },
          data: { type: survivor?.isOwn ? 'OUR_TEAM' : 'EXTERNAL' },
        })
      ).count
    }

    return { reassigned, deleted: sources.length, studiesMoved: studies.length, authorsRetyped, aliasesKept }
  })
}

export async function countCentres(): Promise<number> {
  return prisma.centre.count()
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}
