import { prisma } from '@/lib/prisma'
import { r2GetObject } from '@/lib/services/r2-s3'
import { toJsonValue } from '@/lib/corelab/crf/json'
import { parseCohortFile } from '@/lib/corelab/cohort/parse'
import { examKey, validateCohortRows, type ValidatedRow } from '@/lib/corelab/cohort/validate'
import { assertStudyOpen } from './studies'
import type { CorelabModality, Prisma } from '@/app/generated/prisma'

export type CohortReport = {
  rows: ValidatedRow[]
  ready: number
  warnings: number
  blocked: number
  sitesToCreate: string[]
  parseErrors: Array<{ line: number; message: string }>
}

async function buildReport(studyId: string, fileKey: string, fileName: string): Promise<CohortReport> {
  const [study, sites, patients] = await Promise.all([
    prisma.corelabStudy.findUniqueOrThrow({
      where: { id: studyId },
      select: { modalities: true, maxExamsPerPatient: true, startedAt: true },
    }),
    prisma.corelabSite.findMany({ where: { studyId }, select: { code: true } }),
    prisma.corelabPatient.findMany({ where: { studyId }, select: { code: true, exams: { select: { index: true } } } }),
  ])

  const buffer = await r2GetObject(fileKey)
  const parsed = await parseCohortFile(buffer, fileName)
  const existing = new Set(
    patients.flatMap((patient) => patient.exams.map((exam) => examKey(patient.code, exam.index))),
  )

  const validation = validateCohortRows(parsed.rows, {
    allowedModalities: study.modalities,
    maxExamsPerPatient: study.maxExamsPerPatient,
    studyStartedAt: study.startedAt,
    knownSiteCodes: sites.map((site) => site.code),
    existingPatientExamKeys: existing,
  })

  return { ...validation, parseErrors: parsed.errors }
}

export async function previewCohortImport(studyId: string, fileKey: string, fileName: string): Promise<CohortReport> {
  return buildReport(studyId, fileKey, fileName)
}

export async function commitCohortImport(
  studyId: string,
  fileKey: string,
  fileName: string,
  importedById: string,
): Promise<{ importedRows: number; patientsCreated: number }> {
  await assertStudyOpen(studyId)
  const report = await buildReport(studyId, fileKey, fileName)
  const importable = report.rows.filter((row) => row.verdict !== 'BLOCKED')

  for (const code of report.sitesToCreate) {
    await prisma.corelabSite.upsert({
      where: { studyId_code: { studyId, code } },
      create: { studyId, code },
      update: {},
      select: { id: true },
    })
  }

  const sites = await prisma.corelabSite.findMany({ where: { studyId }, select: { id: true, code: true } })
  const siteByCode = new Map(sites.map((site) => [site.code, site.id]))

  let patientsCreated = 0
  for (const row of importable) {
    const siteId = siteByCode.get(row.centreCode)
    if (!siteId) continue
    const existing = await prisma.corelabPatient.findUnique({
      where: { studyId_code: { studyId, code: row.patientId } },
      select: { id: true },
    })
    const patient = existing ?? (await prisma.corelabPatient.create({
      data: { studyId, siteId, code: row.patientId },
      select: { id: true },
    }))
    if (!existing) patientsCreated += 1

    await prisma.corelabExam.upsert({
      where: { patientId_index: { patientId: patient.id, index: row.examIndex } },
      create: {
        patientId: patient.id,
        index: row.examIndex,
        modality: row.modality as CorelabModality,
        examDate: new Date(`${row.examDate}T00:00:00.000Z`),
        timeLabel: row.timeLabel,
      },
      update: {},
      select: { id: true },
    })
  }

  await prisma.corelabCohortImport.create({
    data: {
      studyId,
      fileName,
      fileKey,
      report: toJsonValue({ ready: report.ready, warnings: report.warnings, blocked: report.blocked, rows: report.rows }),
      importedRows: importable.length,
      importedById,
    },
    select: { id: true },
  })

  return { importedRows: importable.length, patientsCreated }
}

const PATIENT_SELECT = {
  id: true,
  code: true,
  status: true,
  readingMode: true,
  site: { select: { code: true } },
  exams: { select: { id: true, index: true, modality: true, examDate: true, timeLabel: true }, orderBy: { index: 'asc' } },
  assignments: {
    select: {
      id: true,
      role: true,
      status: true,
      dueDate: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
} satisfies Prisma.CorelabPatientSelect

export type CohortPatient = Prisma.CorelabPatientGetPayload<{ select: typeof PATIENT_SELECT }> & {
  reviewerMissing: boolean
}

export async function listPatients(studyId: string): Promise<CohortPatient[]> {
  const patients = await prisma.corelabPatient.findMany({
    where: { studyId },
    select: PATIENT_SELECT,
    orderBy: { code: 'asc' },
  })
  return patients.map((patient) => ({
    ...patient,
    reviewerMissing:
      patient.assignments.some((assignment) => assignment.status === 'SUBMITTED') &&
      !patient.assignments.some((assignment) => assignment.role === 'REVIEWER'),
  }))
}
