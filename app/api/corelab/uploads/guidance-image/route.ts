import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { canAccessApp } from '@/lib/permissions'
import { r2GetSignedDownloadUrl } from '@/lib/services/r2-s3'
import { GUIDANCE_PREFIX } from '../library-guidance/route'

export const runtime = 'nodejs'

// The key travels inside a CRF definition, so it is read back on every reading
// screen: serve it behind a redirect rather than resolving it page by page.
export async function GET(request: NextRequest) {
  const session = await getTypedSession()
  if (!session?.user?.id || !canAccessApp(session.user, 'CORELAB')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const key = request.nextUrl.searchParams.get('key')
  if (!key || !key.startsWith(GUIDANCE_PREFIX) || key.includes('..')) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  return NextResponse.redirect(await r2GetSignedDownloadUrl(key, 600))
}
