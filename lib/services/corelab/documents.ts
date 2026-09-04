import { prisma } from '@/lib/prisma'
import { documentSlotsSchema, type DocumentSlot } from '@/lib/corelab/crf/schema'
import { r2GetSignedDownloadUrl } from '@/lib/services/r2-s3'
import type { CorelabDocumentStatus } from '@/app/generated/prisma'

export async function listSlots(studyId: string): Promise<DocumentSlot[]> {
  const study = await prisma.corelabStudy.findUniqueOrThrow({
    where: { id: studyId },
    select: { documentSlots: true },
  })
  const parsed = documentSlotsSchema.safeParse(study.documentSlots)
  return parsed.success ? parsed.data : []
}

export function matchesAccept(accept: string, fileName: string): boolean {
  const extensions = accept.split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean)
  if (extensions.length === 0) return true
  return extensions.some((extension) => fileName.toLowerCase().endsWith(extension))
}

export type RegisterDocumentInput = {
  assignmentId: string
  examId: string | null
  slotKey: string
  fileName: string
  fileKey: string
  mimeType: string
  fileSize: number
  uploadedById: string
  studyId: string
}

export async function registerUpload(input: RegisterDocumentInput): Promise<{ id: string; status: CorelabDocumentStatus }> {
  const slots = await listSlots(input.studyId)
  const slot = slots.find((candidate) => candidate.id === input.slotKey)
  const conformant = !slot || matchesAccept(slot.accept, input.fileName)

  return prisma.corelabReadingDocument.create({
    data: {
      assignmentId: input.assignmentId,
      examId: input.examId,
      slotKey: input.slotKey,
      fileName: input.fileName,
      fileKey: input.fileKey,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      uploadedById: input.uploadedById,
      status: conformant ? 'CONFORMANT' : 'REJECTED',
      statusNote: conformant ? null : `expected ${slot?.accept ?? ''}`,
    },
    select: { id: true, status: true },
  })
}

export async function deleteDocument(documentId: string, userId: string): Promise<void> {
  const document = await prisma.corelabReadingDocument.findUniqueOrThrow({
    where: { id: documentId },
    select: { uploadedById: true, assignment: { select: { status: true } } },
  })
  if (document.uploadedById !== userId) throw new Error('Forbidden')
  if (document.assignment.status === 'SUBMITTED' || document.assignment.status === 'REVIEWED') {
    throw new Error('ALREADY_SUBMITTED')
  }
  await prisma.corelabReadingDocument.delete({ where: { id: documentId } })
}

export async function documentDownloadUrl(documentId: string): Promise<string> {
  const document = await prisma.corelabReadingDocument.findUniqueOrThrow({
    where: { id: documentId },
    select: { fileKey: true },
  })
  return r2GetSignedDownloadUrl(document.fileKey, 600)
}

export async function studyDocuments(studyId: string) {
  return prisma.corelabStudyDocument.findMany({
    where: { studyId },
    select: { id: true, title: true, fileName: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function addStudyDocument(input: {
  studyId: string
  title: string
  fileKey: string
  fileName: string
  uploadedById: string
}): Promise<{ id: string }> {
  return prisma.corelabStudyDocument.create({ data: input, select: { id: true } })
}

export async function studyDocumentUrl(documentId: string): Promise<string> {
  const document = await prisma.corelabStudyDocument.findUniqueOrThrow({
    where: { id: documentId },
    select: { fileKey: true },
  })
  return r2GetSignedDownloadUrl(document.fileKey, 600)
}
