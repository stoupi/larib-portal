import dotenv from 'dotenv'
import path from 'node:path'
import { PrismaClient } from '../../app/generated/prisma'
import { MIR_DIJON_CRF_V1 } from '../../lib/corelab/crf/mir-dijon-v1'
import { toJsonValue } from '../../lib/corelab/crf/json'
import { MIR_DIJON_CVI42_MAPPINGS } from '../../lib/corelab/import/mapping'
import { crfDefinitionSchema, discordanceThresholdsSchema, documentSlotsSchema } from '../../lib/corelab/crf/schema'

const envFile = process.argv.includes('--test') ? '.env.test' : '.env'
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile), override: true })

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.argv.find((argument) => argument.startsWith('--admin='))?.slice('--admin='.length)
  if (!adminEmail) throw new Error('usage: tsx scripts/corelab/seed-mir-dijon.ts --admin=<email> [--test]')
  const admin = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } })
  if (!admin) throw new Error(`no user ${adminEmail}`)

  const sequences = crfDefinitionSchema.parse(MIR_DIJON_CRF_V1.sequences)
  const thresholds = discordanceThresholdsSchema.parse(MIR_DIJON_CRF_V1.discordanceThresholds)
  const slots = documentSlotsSchema.parse(MIR_DIJON_CRF_V1.documentSlots)

  const study = await prisma.corelabStudy.upsert({
    where: { code: 'MIR-DJ-2024' },
    update: {},
    create: {
      code: 'MIR-DJ-2024',
      name: 'MIR-Dijon — Myocardial Infarction Registry',
      modalities: ['CMR'],
      maxExamsPerPatient: 3,
      reviewDeadlineDays: 14,
      documentSlots: toJsonValue(slots),
      createdById: admin.id,
    },
    select: { id: true, code: true },
  })

  const existing = await prisma.corelabCrfVersion.findFirst({ where: { studyId: study.id }, select: { id: true } })
  if (!existing) {
    await prisma.corelabCrfVersion.create({
      data: { studyId: study.id, number: 1, definition: toJsonValue(sequences), discordanceThresholds: toJsonValue(thresholds), publishedById: admin.id },
    })
  }
  if (process.argv.includes('--with-mappings')) {
    const version = await prisma.corelabCrfVersion.findFirstOrThrow({
      where: { studyId: study.id },
      orderBy: { number: 'desc' },
      select: { id: true },
    })
    await prisma.corelabImportMapping.deleteMany({ where: { crfVersionId: version.id } })
    await prisma.corelabImportMapping.createMany({
      data: MIR_DIJON_CVI42_MAPPINGS.map((entry) => ({
        crfVersionId: version.id,
        software: 'CVI42',
        softwareVersion: 'v2',
        sheetPattern: entry.sheetKey,
        columnHeader: entry.columnHeader,
        cellRef: entry.column,
        sequenceId: entry.sequenceId,
        fieldId: entry.fieldId,
      })),
    })
    console.log(`loaded ${MIR_DIJON_CVI42_MAPPINGS.length} CVI42 mappings`)
  }

  console.log(`study ${study.code} ready (${sequences.length} sequences)`)
}

main().finally(() => prisma.$disconnect())
