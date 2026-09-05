import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { canAdminApp } from '@/lib/permissions'
import { r2PutObject } from '@/lib/services/r2-s3'

export const runtime = 'nodejs'

const MAX_BYTES = 4 * 1024 * 1024

export async function POST(request: NextRequest) {
  const session = await getTypedSession()
  if (!session?.user?.id || !canAdminApp(session.user, 'CORELAB')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get('file')
  const studyId = form.get('studyId')
  if (!(file instanceof File) || typeof studyId !== 'string' || studyId.length === 0) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'file_too_large' }, { status: 400 })

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]+/g, '-')
  const key = `corelab/${studyId}/documents/${Date.now()}-${safeName}`
  await r2PutObject(key, Buffer.from(await file.arrayBuffer()), file.type || 'application/octet-stream')
  return NextResponse.json({ key, fileName: file.name })
}
