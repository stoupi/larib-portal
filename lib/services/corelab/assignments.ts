import { prisma } from '@/lib/prisma'
import { computePace, pairDistribution } from '@/lib/corelab/assignment/rules'
import { sendCorelabAssignmentEmail } from '@/lib/services/email'
import { assertStudyOpen, assertStudyOpenForPatient } from './studies'
import type { CorelabAssignmentRole, CorelabReadingMode, Prisma } from '@/app/generated/prisma'

export type DraftInput = {
  patientId: string
  readingMode: CorelabReadingMode
  reader1?: string | null
  reader2?: string | null
  reviewer?: string | null
}

const ROLE_OF: Array<{ role: CorelabAssignmentRole; key: 'reader1' | 'reader2' | 'reviewer' }> = [
  { role: 'READER_1', key: 'reader1' },
  { role: 'READER_2', key: 'reader2' },
  { role: 'REVIEWER', key: 'reviewer' },
]

export async function saveDraftAssignments(drafts: DraftInput[]): Promise<void> {
  for (const draft of drafts) {
    await assertStudyOpenForPatient(draft.patientId)
    const wanted = draft.readingMode === 'SINGLE'
      ? ROLE_OF.filter((entry) => entry.key !== 'reader2')
      : ROLE_OF

    for (const entry of ROLE_OF) {
      const userId = wanted.includes(entry) ? draft[entry.key] ?? null : null
      const existing = await prisma.corelabReadingAssignment.findUnique({
        where: { patientId_role: { patientId: draft.patientId, role: entry.role } },
        select: { id: true, status: true },
      })
      if (existing && existing.status !== 'DRAFT') continue

      if (!userId) {
        if (existing) await prisma.corelabReadingAssignment.delete({ where: { id: existing.id } })
        continue
      }
      if (existing) {
        await prisma.corelabReadingAssignment.update({ where: { id: existing.id }, data: { userId }, select: { id: true } })
        continue
      }
      await prisma.corelabReadingAssignment.create({
        data: { patientId: draft.patientId, role: entry.role, userId },
        select: { id: true },
      })
    }

    await prisma.corelabPatient.update({
      where: { id: draft.patientId },
      data: { readingMode: draft.readingMode },
      select: { id: true },
    })
  }
}

export async function clearDraft(patientId: string): Promise<void> {
  await prisma.corelabReadingAssignment.deleteMany({ where: { patientId, status: 'DRAFT' } })
}

export async function setReviewer(patientId: string, userId: string | null): Promise<void> {
  const existing = await prisma.corelabReadingAssignment.findUnique({
    where: { patientId_role: { patientId, role: 'REVIEWER' } },
    select: { id: true, status: true },
  })
  if (!userId) {
    if (existing && existing.status === 'DRAFT') await prisma.corelabReadingAssignment.delete({ where: { id: existing.id } })
    return
  }
  if (existing) {
    await prisma.corelabReadingAssignment.update({ where: { id: existing.id }, data: { userId }, select: { id: true } })
    return
  }
  await prisma.corelabReadingAssignment.create({ data: { patientId, role: 'REVIEWER', userId }, select: { id: true } })
}

export async function validateAndSendAssignments(
  studyId: string,
  dueDates: Record<string, string>,
  origin: string,
): Promise<{ readers: number; patients: number }> {
  await assertStudyOpen(studyId)
  const drafts = await prisma.corelabReadingAssignment.findMany({
    where: { status: 'DRAFT', patient: { studyId } },
    select: {
      id: true,
      role: true,
      userId: true,
      patientId: true,
      patient: { select: { id: true, code: true, exams: { select: { id: true } } } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  })
  if (drafts.length === 0) return { readers: 0, patients: 0 }

  const study = await prisma.corelabStudy.findUniqueOrThrow({
    where: { id: studyId },
    select: { id: true, code: true, name: true },
  })
  const now = new Date()
  const readers = new Map<string, { patientIds: string[]; exams: number; name: string; email: string }>()

  for (const draft of drafts) {
    const dueDate = dueDates[draft.userId] ? new Date(`${dueDates[draft.userId]}T23:59:59.999Z`) : null
    await prisma.corelabReadingAssignment.update({
      where: { id: draft.id },
      data: { status: 'ASSIGNED', assignedAt: now, dueDate },
      select: { id: true },
    })
    if (draft.role === 'REVIEWER') continue

    const current = readers.get(draft.userId) ?? {
      patientIds: [],
      exams: 0,
      name: [draft.user.firstName, draft.user.lastName].filter(Boolean).join(' ').trim() || draft.user.email,
      email: draft.user.email,
    }
    current.patientIds.push(draft.patient.id)
    current.exams += draft.patient.exams.length
    readers.set(draft.userId, current)
  }

  await prisma.corelabPatient.updateMany({
    where: { studyId, id: { in: [...new Set(drafts.map((draft) => draft.patientId))] }, status: 'UNASSIGNED' },
    data: { status: 'AWAITING_READING' },
  })

  for (const [userId, reader] of readers) {
    const rawDueDate = dueDates[userId]
    if (!rawDueDate) continue
    const dueDate = new Date(`${rawDueDate}T23:59:59.999Z`)
    const pace = computePace(reader.patientIds.length, dueDate, now)

    const batch = await prisma.corelabAssignmentBatch.create({
      data: {
        studyId,
        userId,
        patientIds: reader.patientIds,
        dueDate,
        paceAmount: pace.amount,
        paceUnit: pace.unit,
        sentAt: now,
      },
      select: { id: true },
    })
    await prisma.corelabReadingAssignment.updateMany({
      where: { userId, patientId: { in: reader.patientIds }, status: 'ASSIGNED' },
      data: { batchId: batch.id },
    })

    await sendCorelabAssignmentEmail({
      to: reader.email,
      readerName: reader.name,
      studyName: study.name,
      studyCode: study.code,
      patientCount: reader.patientIds.length,
      examCount: reader.exams,
      dueDate: rawDueDate,
      pace,
      readingsUrl: `${origin}/en/corelab/studies/${study.id}/readings`,
    })
  }

  return { readers: readers.size, patients: new Set(drafts.map((draft) => draft.patientId)).size }
}

export async function workload(studyId: string) {
  const assignments = await prisma.corelabReadingAssignment.findMany({
    where: { patient: { studyId }, role: { in: ['READER_1', 'READER_2'] }, status: { not: 'DRAFT' } },
    select: {
      userId: true,
      dueDate: true,
      status: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      patient: { select: { id: true, code: true, exams: { select: { id: true } } } },
    },
  })

  const byReader = new Map<string, { name: string; patients: number; exams: number; dueDate: Date | null }>()
  for (const assignment of assignments) {
    const current = byReader.get(assignment.userId) ?? {
      name: [assignment.user.firstName, assignment.user.lastName].filter(Boolean).join(' ').trim() || assignment.user.email,
      patients: 0,
      exams: 0,
      dueDate: assignment.dueDate,
    }
    current.patients += 1
    current.exams += assignment.patient.exams.length
    if (assignment.dueDate && (!current.dueDate || assignment.dueDate < current.dueDate)) current.dueDate = assignment.dueDate
    byReader.set(assignment.userId, current)
  }

  const patients = await prisma.corelabPatient.findMany({
    where: { studyId },
    select: {
      exams: { select: { id: true } },
      assignments: { where: { role: { in: ['READER_1', 'READER_2'] } }, select: { userId: true } },
    },
  })

  return {
    readers: [...byReader.entries()].map(([userId, value]) => ({ userId, ...value })),
    pairs: pairDistribution(
      patients.map((patient) => ({
        readers: patient.assignments.map((assignment) => assignment.userId),
        examCount: patient.exams.length,
      })),
    ),
  }
}

const MY_ASSIGNMENT_SELECT = {
  id: true,
  role: true,
  status: true,
  dueDate: true,
  patient: {
    select: {
      id: true,
      code: true,
      status: true,
      site: { select: { code: true } },
      exams: { select: { id: true, index: true, modality: true, examDate: true, timeLabel: true } },
    },
  },
} satisfies Prisma.CorelabReadingAssignmentSelect

export type MyAssignment = Prisma.CorelabReadingAssignmentGetPayload<{ select: typeof MY_ASSIGNMENT_SELECT }>

export async function listMyAssignments(userId: string, studyId: string): Promise<MyAssignment[]> {
  const assignments = await prisma.corelabReadingAssignment.findMany({
    where: { userId, status: { not: 'DRAFT' }, role: { not: 'REVIEWER' }, patient: { studyId } },
    select: MY_ASSIGNMENT_SELECT,
    orderBy: [{ dueDate: 'asc' }],
  })
  return [
    ...assignments.filter((assignment) => assignment.status === 'RETURNED'),
    ...assignments.filter((assignment) => assignment.status !== 'RETURNED'),
  ]
}

export async function countPendingReadings(userId: string): Promise<number> {
  return prisma.corelabReadingAssignment.count({
    where: { userId, role: { not: 'REVIEWER' }, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'RETURNED'] } },
  })
}
