import { PrismaClient } from '@/app/generated/prisma'

// One-shot transfer of the Publications domain from the working database to another
// one. The two databases share a schema but not their users: the working copy was
// filled by a test account that does not exist on the target, so every "created by"
// is rebound to an owner resolved by email.

const BATCH_SIZE = 500

type TransferCounts = Record<string, number>

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

async function insertInBatches<Row>(
  rows: Row[],
  insert: (batch: Row[]) => Promise<{ count: number }>,
): Promise<number> {
  let inserted = 0
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const result = await insert(rows.slice(start, start + BATCH_SIZE))
    inserted += result.count
  }
  return inserted
}

async function buildUserIdMap(source: PrismaClient, target: PrismaClient) {
  const sourceUsers = await source.user.findMany({ select: { id: true, email: true } })
  const targetUsers = await target.user.findMany({ select: { id: true, email: true } })
  const targetIdByEmail = new Map(targetUsers.map((user) => [user.email.toLowerCase(), user.id]))

  const mappedTargetId = new Map<string, string | null>()
  for (const sourceUser of sourceUsers) {
    mappedTargetId.set(sourceUser.id, targetIdByEmail.get(sourceUser.email.toLowerCase()) ?? null)
  }
  return mappedTargetId
}

async function main() {
  const sourceUrl = requireEnv('SOURCE_DATABASE_URL')
  const targetUrl = requireEnv('TARGET_DATABASE_URL')
  const ownerEmail = requireEnv('OWNER_EMAIL')
  const apply = process.argv.includes('--apply')

  const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } })
  const target = new PrismaClient({ datasources: { db: { url: targetUrl } } })

  const owner = await target.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
  if (!owner) throw new Error(`Owner ${ownerEmail} does not exist on the target database`)

  const mappedTargetId = await buildUserIdMap(source, target)
  const ownerOr = (sourceUserId: string) => mappedTargetId.get(sourceUserId) ?? owner.id
  const targetUserOrNull = (sourceUserId: string | null) =>
    sourceUserId ? (mappedTargetId.get(sourceUserId) ?? null) : null

  const centres = await source.centre.findMany()
  const centreAliases = await source.centreAlias.findMany()
  const affiliations = await source.affiliation.findMany()
  const authors = await source.author.findMany()
  const authorCentres = await source.authorCentre.findMany()
  const authorAffiliations = await source.authorAffiliation.findMany()
  const journals = await source.journal.findMany()
  const studies = await source.study.findMany()
  const studyCentres = await source.$queryRawUnsafe<Array<{ A: string; B: string }>>(
    'select "A", "B" from "_StudyCentres"',
  )
  const studyInvestigators = await source.studyInvestigator.findMany()
  const articles = await source.article.findMany()
  const authorships = await source.authorship.findMany()
  const authorshipAffiliations = await source.authorshipAffiliation.findMany()
  const submissions = await source.submission.findMany()
  const journalTargets = await source.journalTarget.findMany()
  const authorListRequests = await source.authorListRequest.findMany()

  const toTransfer: TransferCounts = {
    Centre: centres.length,
    CentreAlias: centreAliases.length,
    Affiliation: affiliations.length,
    Author: authors.length,
    AuthorCentre: authorCentres.length,
    AuthorAffiliation: authorAffiliations.length,
    Journal: journals.length,
    Study: studies.length,
    StudyCentres: studyCentres.length,
    StudyInvestigator: studyInvestigators.length,
    Article: articles.length,
    Authorship: authorships.length,
    AuthorshipAffiliation: authorshipAffiliations.length,
    Submission: submissions.length,
    JournalTarget: journalTargets.length,
    AuthorListRequest: authorListRequests.length,
  }

  const droppedAuthorUserLinks = authors.filter(
    (author) => author.userId !== null && targetUserOrNull(author.userId) === null,
  ).length

  console.log('Rows to transfer:')
  for (const [table, count] of Object.entries(toTransfer)) console.log(`  ${table}: ${count}`)
  console.log(`Owner for orphaned "created by": ${ownerEmail} (${owner.id})`)
  console.log(`Author -> user links dropped (no matching account on target): ${droppedAuthorUserLinks}`)

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write to the target database.')
    await source.$disconnect()
    await target.$disconnect()
    return
  }

  const inserted: TransferCounts = {}

  inserted.Centre = await insertInBatches(centres, (batch) =>
    target.centre.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.CentreAlias = await insertInBatches(centreAliases, (batch) =>
    target.centreAlias.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.Affiliation = await insertInBatches(affiliations, (batch) =>
    target.affiliation.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.Author = await insertInBatches(
    authors.map((author) => ({ ...author, userId: targetUserOrNull(author.userId) })),
    (batch) => target.author.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.AuthorCentre = await insertInBatches(authorCentres, (batch) =>
    target.authorCentre.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.AuthorAffiliation = await insertInBatches(authorAffiliations, (batch) =>
    target.authorAffiliation.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.Journal = await insertInBatches(journals, (batch) =>
    target.journal.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.Study = await insertInBatches(
    studies.map((study) => ({ ...study, createdById: ownerOr(study.createdById) })),
    (batch) => target.study.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.StudyCentres = await insertInBatches(studyCentres, async (batch) => {
    const values = batch.map((link) => `('${link.A}', '${link.B}')`).join(', ')
    const count = await target.$executeRawUnsafe(
      `insert into "_StudyCentres" ("A", "B") values ${values} on conflict do nothing`,
    )
    return { count }
  })
  inserted.StudyInvestigator = await insertInBatches(studyInvestigators, (batch) =>
    target.studyInvestigator.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.Article = await insertInBatches(
    articles.map((article) => ({ ...article, createdById: ownerOr(article.createdById) })),
    (batch) => target.article.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.Authorship = await insertInBatches(authorships, (batch) =>
    target.authorship.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.AuthorshipAffiliation = await insertInBatches(authorshipAffiliations, (batch) =>
    target.authorshipAffiliation.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.Submission = await insertInBatches(submissions, (batch) =>
    target.submission.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.JournalTarget = await insertInBatches(journalTargets, (batch) =>
    target.journalTarget.createMany({ data: batch, skipDuplicates: true }),
  )
  inserted.AuthorListRequest = await insertInBatches(
    authorListRequests.map((request) => ({
      ...request,
      requestedById: ownerOr(request.requestedById),
      resolvedById: request.resolvedById ? ownerOr(request.resolvedById) : null,
    })),
    (batch) => target.authorListRequest.createMany({ data: batch, skipDuplicates: true }),
  )

  console.log('\nInserted:')
  for (const [table, count] of Object.entries(inserted)) {
    const expected = toTransfer[table]
    console.log(`  ${table}: ${count}/${expected}${count === expected ? '' : '  <- check'}`)
  }

  await source.$disconnect()
  await target.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
