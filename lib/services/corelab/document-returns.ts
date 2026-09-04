import { prisma } from '@/lib/prisma'
import { listSlots } from './documents'

export async function returnForDocuments(
  patientId: string,
  requestedById: string,
  message: string,
  slotKeys: string[],
): Promise<{ id: string }> {
  const patient = await prisma.corelabPatient.findUniqueOrThrow({
    where: { id: patientId },
    select: { assignments: { where: { role: { not: 'REVIEWER' } }, select: { id: true } } },
  })

  const created = await prisma.corelabDocumentReturn.create({
    data: { patientId, requestedById, message, slotKeys },
    select: { id: true },
  })

  await prisma.corelabReadingAssignment.updateMany({
    where: { id: { in: patient.assignments.map((assignment) => assignment.id) }, status: 'SUBMITTED' },
    data: { status: 'RETURNED' },
  })
  await prisma.corelabPatient.update({
    where: { id: patientId },
    data: { status: 'RETURNED_FOR_DOCUMENTS' },
    select: { id: true },
  })
  await prisma.corelabReadingDocument.updateMany({
    where: { assignmentId: { in: patient.assignments.map((assignment) => assignment.id) }, slotKey: { in: slotKeys } },
    data: { status: 'MISSING' },
  })

  return created
}

export async function openReturnFor(patientId: string) {
  return prisma.corelabDocumentReturn.findFirst({
    where: { patientId, resolvedAt: null },
    select: { id: true, message: true, slotKeys: true, requestedAt: true },
    orderBy: { requestedAt: 'desc' },
  })
}

export async function resolveReturn(returnId: string, userId: string): Promise<{ resolved: boolean; missing: string[] }> {
  const documentReturn = await prisma.corelabDocumentReturn.findUniqueOrThrow({
    where: { id: returnId },
    select: { id: true, patientId: true, slotKeys: true, resolvedAt: true },
  })
  if (documentReturn.resolvedAt) return { resolved: true, missing: [] }

  const patient = await prisma.corelabPatient.findUniqueOrThrow({
    where: { id: documentReturn.patientId },
    select: { studyId: true, assignments: { where: { role: { not: 'REVIEWER' } }, select: { id: true, userId: true } } },
  })
  const mine = patient.assignments.find((assignment) => assignment.userId === userId)
  if (!mine) throw new Error('Forbidden')

  const slots = await listSlots(patient.studyId)
  const required = documentReturn.slotKeys.filter(
    (slotKey) => slots.find((slot) => slot.id === slotKey)?.required !== false,
  )
  const documents = await prisma.corelabReadingDocument.findMany({
    where: { assignmentId: mine.id, slotKey: { in: required }, status: 'CONFORMANT' },
    select: { slotKey: true },
  })
  const provided = new Set(documents.map((document) => document.slotKey))
  const missing = required.filter((slotKey) => !provided.has(slotKey))
  if (missing.length > 0) return { resolved: false, missing }

  await prisma.corelabDocumentReturn.update({
    where: { id: documentReturn.id },
    data: { resolvedAt: new Date() },
    select: { id: true },
  })
  await prisma.corelabReadingAssignment.updateMany({
    where: { id: { in: patient.assignments.map((assignment) => assignment.id) }, status: 'RETURNED' },
    data: { status: 'SUBMITTED' },
  })
  await prisma.corelabPatient.update({
    where: { id: documentReturn.patientId },
    data: { status: 'UNDER_REVIEW' },
    select: { id: true },
  })

  return { resolved: true, missing: [] }
}
