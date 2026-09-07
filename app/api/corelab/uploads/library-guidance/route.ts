import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { canAdminApp } from '@/lib/permissions'
import { r2PutObject } from '@/lib/services/r2-s3'

export const runtime = 'nodejs'

export const GUIDANCE_PREFIX = 'corelab/library/guidance/'

// A Vercel function refuses a request body larger than 4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  const session = await getTypedSession()
  if (!session?.user?.id || !canAdminApp(session.user, 'CORELAB')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  if (!ACCEPTED.includes(file.type)) return NextResponse.json({ error: 'unsupported_type' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'file_too_large' }, { status: 400 })

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]+/g, '-')
  const key = `${GUIDANCE_PREFIX}${Date.now()}-${safeName}`
  await r2PutObject(key, Buffer.from(await file.arrayBuffer()), file.type)
  return NextResponse.json({ key })
}
