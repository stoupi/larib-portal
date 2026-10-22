import { test, expect, type Page } from '@playwright/test'
import { PrismaClient } from '../../app/generated/prisma'

test.setTimeout(180000)

const prisma = new PrismaClient()

const WATCH_ENDPOINT = '/api/cron/publications-pubmed-watch'
const CRON_SECRET = 'e2e-cron-secret'
const PMIDS = ['39000101', '39000102', '39000103']
const TITLE_PREFIX = 'PubMed watch pilot'
const SAME_TITLE = `${TITLE_PREFIX}: Late Gadolinium Enhancement in Dilated Cardiomyopathy`
const REWORDED_TITLE = `${TITLE_PREFIX}: a visual extent threshold for risk stratification in ischemic cardiomyopathy`
const REWORDED_PAPER = `${TITLE_PREFIX}: a visual extent cutoff for risk stratification in ischemic cardiomyopathy.`
const UNKNOWN_PAPER = `${TITLE_PREFIX}: valve-in-valve procedures after surgical bioprosthesis failure.`
const JCMR = 'Journal of Cardiovascular Magnetic Resonance'

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

async function acceptedArticle(title: string, journalName: string, createdById: string): Promise<string> {
  const journal = await prisma.journal.upsert({ where: { name: journalName }, update: {}, create: { name: journalName } })
  const article = await prisma.article.create({
    data: {
      title,
      status: 'ACCEPTED',
      createdById,
      submissions: { create: { journalId: journal.id, submittedAt: new Date('2026-03-01'), status: 'ACCEPTED' } },
    },
  })
  return article.id
}

test.beforeEach(async () => {
  await prisma.publicationPubmedAlert.deleteMany({ where: { pmid: { in: PMIDS } } })
  await prisma.article.deleteMany({
    where: { OR: [{ pubmedId: { in: PMIDS } }, { title: { startsWith: TITLE_PREFIX } }] },
  })
})

test.afterAll(async () => {
  await prisma.$disconnect()
})

test('the PubMed watch links what it is sure of and leaves the rest to the admin', async ({ page, request }) => {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'publications-admin@larib-portal.test' } })
  const sameTitleId = await acceptedArticle(SAME_TITLE, JCMR, admin.id)
  const rewordedId = await acceptedArticle(REWORDED_TITLE, 'European Heart Journal', admin.id)

  const unauthorized = await request.get(WATCH_ENDPOINT)
  expect(unauthorized.status()).toBe(401)

  // Same title: linked at once. Reworded title in another journal, or nothing alike: left to the admin
  const firstRun = await request.get(WATCH_ENDPOINT, { headers: { authorization: `Bearer ${CRON_SECRET}` } })
  expect(firstRun.status()).toBe(200)
  const firstReport: { autoLinked: string[]; pending: string[] } = await firstRun.json()
  expect(firstReport.autoLinked).toEqual(['39000101'])
  expect(firstReport.pending.sort()).toEqual(['39000102', '39000103'])

  const linked = await prisma.article.findUniqueOrThrow({
    where: { id: sameTitleId },
    select: { status: true, pubmedId: true, doi: true, publishedJournal: { select: { name: true } } },
  })
  expect(linked).toEqual({
    status: 'PUBLISHED',
    pubmedId: '39000101',
    doi: '10.1016/j.jocmr.2026.900101',
    publishedJournal: { name: JCMR },
  })
  expect(await prisma.journal.count({ where: { name: { startsWith: 'Journal of cardiovascular magnetic resonance :' } } })).toBe(0)

  // A paper already handled never comes back
  const secondRun = await request.get(WATCH_ENDPOINT, { headers: { authorization: `Bearer ${CRON_SECRET}` } })
  expect(await secondRun.json()).toMatchObject({ autoLinked: [], pending: [] })

  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/fr/publications/admin', { timeout: 60000 })
  // The PubMed watch lives with the mail agent's suggestions, behind the same module
  await page.getByRole('link', { name: /Propositions de l'agent mails/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: "Propositions de l'agent mails" })).toBeVisible({ timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Veille PubMed · MIRACL.ai · 2' })).toBeVisible()

  const reworded = page.getByRole('listitem', { name: REWORDED_PAPER })
  await expect(reworded.getByText('Une publication de la base porte un titre proche, mais dans une autre revue : à confirmer.')).toBeVisible()
  await expect(reworded.getByText('Auteurs : Theo Pezel, Solenn Toupin')).toBeVisible()
  await expect(reworded.getByRole('link', { name: 'Voir sur PubMed' })).toHaveAttribute('href', 'https://pubmed.ncbi.nlm.nih.gov/39000102/')
  await reworded.getByRole('button', { name: 'Relier à cette publication' }).click()
  await expect(page.getByText('Publication reliée à sa fiche PubMed')).toBeVisible({ timeout: 30000 })
  await expect(reworded).toHaveCount(0, { timeout: 15000 })

  const unknown = page.getByRole('listitem', { name: UNKNOWN_PAPER })
  await expect(unknown.getByText("Aucune publication de la base ne correspond : l'importer ou la relier à la main.")).toBeVisible()
  await expect(unknown.getByRole('button', { name: 'Relier à cette publication' })).toHaveCount(0)
  await unknown.getByRole('button', { name: 'Importer comme nouvelle publication' }).click()
  await expect(page.getByText('Publication importée depuis PubMed')).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('Aucun papier en attente : tout ce que PubMed a publié est relié.')).toBeVisible({ timeout: 15000 })

  const history = page.getByRole('region', { name: 'Historique PubMed' })
  await expect(history.getByRole('row').filter({ hasText: SAME_TITLE }).filter({ hasText: 'Reliée automatiquement' })).toBeVisible()
  await expect(history.getByRole('row').filter({ hasText: REWORDED_TITLE }).filter({ hasText: 'Reliée' })).toBeVisible()
  await expect(history.getByRole('row').filter({ hasText: '39000103' }).filter({ hasText: 'Importée' })).toBeVisible()

  const rewordedAfter = await prisma.article.findUniqueOrThrow({ where: { id: rewordedId }, select: { status: true, pubmedId: true } })
  expect(rewordedAfter).toEqual({ status: 'PUBLISHED', pubmedId: '39000102' })
  const imported = await prisma.article.findFirstOrThrow({
    where: { pubmedId: '39000103' },
    select: { status: true, scope: true, _count: { select: { authorships: true } } },
  })
  expect(imported).toEqual({ status: 'PUBLISHED', scope: 'LARIB_TEAM', _count: { authorships: 2 } })

  await page.goto('/en/publications/admin/mail-agent', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'PubMed watch · MIRACL.ai · 0' })).toBeVisible({ timeout: 60000 })
  await expect(page.getByText('No paper waiting: everything PubMed published is linked.')).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'PubMed history' }).getByRole('row').filter({ hasText: SAME_TITLE }).filter({ hasText: 'Linked automatically' }),
  ).toBeVisible()
})
