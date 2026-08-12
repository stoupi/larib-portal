import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { canAccessApp, canAdminApp } from '@/lib/permissions'
import { userIsFirstAuthor } from '@/lib/services/publications/publication-editor'
import { findOpenAccessPdf } from '@/lib/services/publications/open-access-pdf'
import { looksLikePdf, isPublicHttpUrl, readCappedBody } from '@/lib/publications/open-access-pdf'
import { r2PutObject } from '@/lib/services/r2-s3'
import { prisma } from '@/lib/prisma'
import type { ArticleStatusValue } from '@/lib/services/publications/articles'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_PDF_BYTES = 30 * 1024 * 1024
const DOWNLOAD_TIMEOUT_MS = 30_000
const ELIGIBLE_STATUSES: ArticleStatusValue[] = ['ACCEPTED', 'PUBLISHED']

function announcedLength(header: string | null): number | null {
  const announced = Number(header)
  return Number.isSafeInteger(announced) && announced >= 0 ? announced : null
}

export async function POST(request: NextRequest) {
  const session = await getTypedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!canAccessApp(session.user, 'PUBLICATIONS')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => null)) as { articleId?: unknown } | null
  const articleId = typeof body?.articleId === 'string' ? body.articleId : ''
  if (articleId.length === 0) return NextResponse.json({ error: 'article_missing' }, { status: 400 })

  const canEdit =
    canAdminApp(session.user, 'PUBLICATIONS') || (await userIsFirstAuthor(session.user.id, articleId))
  if (!canEdit) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { status: true, doi: true, pubmedId: true },
  })
  if (!article) return NextResponse.json({ error: 'article_unknown' }, { status: 404 })
  if (!ELIGIBLE_STATUSES.some((eligible) => eligible === article.status)) {
    return NextResponse.json({ error: 'status_not_eligible' }, { status: 400 })
  }

  const found = await findOpenAccessPdf({ pubmedId: article.pubmedId, doi: article.doi })
  if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  try {
    const response = await fetch(found.url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    })
    if (!response.ok) {
      console.error(`[open-access] ${found.source} download from ${found.url} answered ${response.status}`)
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    // This guard discards the response, not the request: the internal GET has already been
    // issued by the time a redirect lands here. It is not airtight, by accepted decision.
    const fixtureMode = process.env.NODE_ENV !== 'production' && Boolean(process.env.OPEN_ACCESS_FIXTURE_DIR)
    if (!fixtureMode && !isPublicHttpUrl(response.url)) {
      console.error(`[open-access] ${found.source} download from ${found.url} redirected to a non public url`)
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const announced = announcedLength(response.headers.get('content-length'))
    if (announced !== null && announced > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
    }
    if (!response.body) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const bytes = await readCappedBody(response.body, MAX_PDF_BYTES)
    if (!bytes) return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
    if (!looksLikePdf(response.headers.get('content-type'), bytes)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const uploaded = await r2PutObject(
      `publications/${articleId}/${Date.now()}-open-access.pdf`,
      bytes,
      'application/pdf',
    )
    return NextResponse.json({ url: uploaded.url, key: uploaded.key, source: found.source })
  } catch (error) {
    console.error('Open access PDF fetch failed', error)
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
}
