import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { canAccessApp, canAdminApp } from '@/lib/permissions'
import { userIsFirstAuthor } from '@/lib/services/publications/publication-editor'
import { r2PutObject } from '@/lib/services/r2-s3'

export const runtime = 'nodejs'

const MAX_PDF_BYTES = 30 * 1024 * 1024

function buildPublicationPdfKey(articleId: string, filename: string): string {
  const safe = filename.trim().replace(/[^a-zA-Z0-9_.-]+/g, '-')
  return `publications/${articleId}/${Date.now()}-${safe}`
}

export async function POST(request: NextRequest) {
  const session = await getTypedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!canAccessApp(session.user, 'PUBLICATIONS')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const form = await request.formData()
  const file = form.get('file')
  const articleId = form.get('articleId')

  if (typeof articleId !== 'string' || articleId.length === 0) {
    return NextResponse.json({ error: 'article_missing' }, { status: 400 })
  }
  if (!(file instanceof File)) return NextResponse.json({ error: 'file_missing' }, { status: 400 })
  if (file.type !== 'application/pdf') return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
  if (file.size > MAX_PDF_BYTES) return NextResponse.json({ error: 'file_too_large' }, { status: 400 })

  const canEdit =
    canAdminApp(session.user, 'PUBLICATIONS') || (await userIsFirstAuthor(session.user.id, articleId))
  if (!canEdit) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const uploaded = await r2PutObject(
      buildPublicationPdfKey(articleId, file.name),
      Buffer.from(await file.arrayBuffer()),
      file.type,
    )
    return NextResponse.json({ url: uploaded.url, key: uploaded.key })
  } catch (error) {
    console.error('Publication PDF upload failed', error)
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
  }
}
