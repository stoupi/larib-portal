import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { canAccessApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { r2PutObject } from '@/lib/services/r2-s3'
import { listSlots, matchesAccept } from '@/lib/services/corelab/documents'

export const runtime = 'nodejs'

// Files above this size go through a presigned PUT instead: a Vercel function
// refuses a request body larger than 4.5 MB.
export const SERVER_UPLOAD_MAX_BYTES = 4 * 1024 * 1024

export async function POST(request: NextRequest) {
  const session = await getTypedSession()
  if (!session?.user?.id || !canAccessApp(session.user, 'CORELAB')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get('file')
  const assignmentId = form.get('assignmentId')
  const slotKey = form.get('slotKey')
  if (!(file instanceof File) || typeof assignmentId !== 'string' || typeof slotKey !== 'string') {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }
  if (file.size > SERVER_UPLOAD_MAX_BYTES) return NextResponse.json({ error: 'file_too_large' }, { status: 400 })

  const assignment = await prisma.corelabReadingAssignment.findUnique({
    where: { id: assignmentId },
    select: { userId: true, patient: { select: { id: true, studyId: true } } },
  })
  if (!assignment || assignment.userId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const slots = await listSlots(assignment.patient.studyId)
  const slot = slots.find((candidate) => candidate.id === slotKey)
  if (slot && !matchesAccept(slot.accept, file.name)) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]+/g, '-')
  const key = `corelab/${assignment.patient.studyId}/patients/${assignment.patient.id}/${assignmentId}/${slotKey}-${Date.now()}-${safeName}`
  await r2PutObject(key, Buffer.from(await file.arrayBuffer()), file.type || 'application/octet-stream')
  return NextResponse.json({ key })
}
