import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { runAuditedOperation } from '@/lib/audit/context'
import { writeAuditOperation } from '@/lib/audit/writer'
import { prismaWithoutAudit } from '@/lib/prisma'
import { PUBLICATIONS_ARTICLES_TAG } from '@/lib/services/publications/import'
import { PUBLICATIONS_PUBMED_ALERTS_TAG, runPubmedWatch } from '@/lib/services/publications/pubmed-watch'
import { sendPubmedAlertEmails } from '@/lib/services/publications/pubmed-alert-send'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'cron_secret_missing' }, { status: 500 })
  }
  if (!isAuthorizedCron(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const report = await runAuditedOperation(
    { actorId: null, actorLabel: 'PubMed · MIRACL.ai', source: 'CRON', summary: null, ipAddress: null },
    () => runPubmedWatch(),
    (operation) => writeAuditOperation(prismaWithoutAudit, operation),
  )
  revalidateTag(PUBLICATIONS_PUBMED_ALERTS_TAG)
  revalidateTag(PUBLICATIONS_ARTICLES_TAG)
  const emails = await sendPubmedAlertEmails(report)

  return NextResponse.json({
    found: report.found,
    autoLinked: report.autoLinked.map((alert) => alert.pmid),
    pending: report.pending.map((alert) => alert.pmid),
    ...emails,
  })
}
