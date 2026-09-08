import dotenv from 'dotenv'
import path from 'node:path'
import { PrismaClient } from '../../app/generated/prisma'
import { MIR_DIJON_CRF_V1 } from '../../lib/corelab/crf/mir-dijon-v1'
import { MIR_DIJON_VALUE_SETS } from '../../lib/corelab/crf/mir-dijon-v1/value-sets'
import { extractLibrary } from '../../lib/corelab/crf/library-extract'
import { crfDefinitionSchema } from '../../lib/corelab/crf/schema'
import { toJsonValue } from '../../lib/corelab/crf/json'

const explicitEnv = process.argv.find((argument) => argument.startsWith('--env='))?.slice('--env='.length)
const envFile = explicitEnv ?? (process.argv.includes('--test') ? '.env.test' : '.env')
dotenv.config({ path: path.resolve(process.cwd(), envFile), override: true })
console.log(`seeding the library into ${new URL(process.env.DATABASE_URL ?? '').pathname.slice(1)}`)

const prisma = new PrismaClient()

async function main() {
  const sequences = crfDefinitionSchema.parse(MIR_DIJON_CRF_V1.sequences)
  const { valueSets, variables, blocks } = extractLibrary(sequences, 'CMR', MIR_DIJON_VALUE_SETS)

  const valueSetIdByCode = new Map<string, string>()
  for (const valueSet of valueSets) {
    const saved = await prisma.corelabValueSet.upsert({
      where: { code: valueSet.code },
      update: { name: valueSet.name, modality: 'CMR', description: valueSet.description, deprecated: false },
      create: { code: valueSet.code, name: valueSet.name, modality: 'CMR', description: valueSet.description },
      select: { id: true },
    })
    valueSetIdByCode.set(valueSet.code, saved.id)

    for (const item of valueSet.items) {
      await prisma.corelabValueSetItem.upsert({
        where: { valueSetId_code: { valueSetId: saved.id, code: item.code } },
        update: { label: item.label, colour: item.colour, order: item.order, deprecated: false },
        create: { valueSetId: saved.id, code: item.code, label: item.label, colour: item.colour, order: item.order },
        select: { id: true },
      })
    }

    const wanted = new Set(valueSet.items.map((item) => item.code))
    const stale = await prisma.corelabValueSetItem.findMany({
      where: { valueSetId: saved.id, code: { notIn: [...wanted] }, deprecated: false },
      select: { id: true, code: true },
    })
    for (const item of stale) {
      await prisma.corelabValueSetItem.update({ where: { id: item.id }, data: { deprecated: true }, select: { id: true } })
      console.log(`  deprecated stale value ${valueSet.code}.${item.code}`)
    }
  }

  for (const variable of variables) {
    const valueSetId = variable.valueSetCode ? valueSetIdByCode.get(variable.valueSetCode) ?? null : null
    const data = {
      name: variable.name,
      modality: 'CMR' as const,
      type: variable.type,
      params: toJsonValue(variable.params),
      valueSetId,
      deprecated: false,
    }
    await prisma.corelabLibraryVariable.upsert({
      where: { code: variable.code },
      update: data,
      create: { code: variable.code, ...data },
      select: { id: true },
    })
  }

  for (const block of blocks) {
    const data = {
      name: block.name,
      kind: block.kind,
      modality: 'CMR' as const,
      definition: toJsonValue(block.definition),
      deprecated: false,
    }
    await prisma.corelabLibraryBlock.upsert({
      where: { code: block.code },
      update: data,
      create: { code: block.code, ...data },
      select: { id: true },
    })
  }

  console.log(
    `CMR library ready from MIR-Dijon: ${valueSets.length} value sets, ${variables.length} variables, ` +
      `${blocks.filter((block) => block.kind === 'SEQUENCE').length} sequences, ` +
      `${blocks.filter((block) => block.kind === 'SECTION').length} sections`,
  )
}

main().finally(() => prisma.$disconnect())
