import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { canAccessApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { r2GetSignedUploadUrl } from '@/lib/services/r2-s3'
import { listSlots, matchesAccept } from '@/lib/services/corelab/documents'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = await getTypedSession()
  if (!session?.user?.id || !canAccessApp(session.user, 'CORELAB')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { assignmentId, slotKey, filename, contentType } = body as {
    assignmentId?: string; slotKey?: string; filename?: string; contentType?: string
  }
  if (!assignmentId || !slotKey || !filename || !contentType) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const assignment = await prisma.corelabReadingAssignment.findUnique({
    where: { id: assignmentId },
    select: { userId: true, patient: { select: { id: true, studyId: true } } },
  })
  if (!assignment || assignment.userId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const slots = await listSlots(assignment.patient.studyId)
  const slot = slots.find((candidate) => candidate.id === slotKey)
  if (slot && !matchesAccept(slot.accept, filename)) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 400 })
  }

  const safeName = filename.replace(/[^a-zA-Z0-9_.-]+/g, '-')
  const key = `corelab/${assignment.patient.studyId}/patients/${assignment.patient.id}/${assignmentId}/${slotKey}-${Date.now()}-${safeName}`
  const { uploadUrl } = await r2GetSignedUploadUrl(key, contentType, 3600)
  return NextResponse.json({ uploadUrl, key })
}
