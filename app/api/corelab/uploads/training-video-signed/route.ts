import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { canAdminApp } from '@/lib/permissions'
import { r2GetSignedUploadUrl } from '@/lib/services/r2-s3'
import { buildTrainingVideoKey, isAcceptedVideo } from '@/lib/corelab/training/video'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = await getTypedSession()
  if (!session?.user?.id || !canAdminApp(session.user, 'CORELAB')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { moduleId, filename, contentType, size } = body as {
    moduleId?: string; filename?: string; contentType?: string; size?: number
  }

  if (!moduleId || !filename || !contentType || typeof size !== 'number') {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }
  if (!isAcceptedVideo(contentType, size)) {
    return NextResponse.json({ error: 'unsupported_video' }, { status: 400 })
  }

  try {
    const key = buildTrainingVideoKey(moduleId, filename)
    const { uploadUrl } = await r2GetSignedUploadUrl(key, contentType, 3600)
    return NextResponse.json({ uploadUrl, key })
  } catch (error) {
    console.error('Failed to sign the training video upload', error)
    return NextResponse.json({ error: 'signing_failed' }, { status: 500 })
  }
}
