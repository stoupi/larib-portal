import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { runAuditedOperation } from '@/lib/audit/context'
import { writeAuditOperation } from '@/lib/audit/writer'
import { prismaWithoutAudit } from '@/lib/prisma'
import { MAIL_DECISIONS, MAIL_EVENT_KINDS } from '@/lib/publications/mail-agent'
import { PUBLICATIONS_ARTICLES_TAG } from '@/lib/services/publications/import'
import { ingestMailObservations, PUBLICATIONS_MAIL_SUGGESTIONS_TAG } from '@/lib/services/publications/mail-suggestions'

export const runtime = 'nodejs'

const observationSchema = z
  .object({
    messageId: z.string().trim().min(1).max(200),
    threadUrl: z.string().url().startsWith('https://mail.google.com/').max(500).nullable(),
    sender: z.string().trim().min(1).max(200),
    subject: z.string().trim().min(1).max(300),
    body: z.string().trim().max(50000).nullable(),
    receivedAt: z.coerce.date(),
    kind: z.enum(MAIL_EVENT_KINDS),
    decision: z.enum(MAIL_DECISIONS).nullable(),
    title: z.string().trim().min(1).max(500),
    journalName: z.string().trim().min(1).max(200),
    manuscriptNumber: z.string().trim().min(1).max(80).nullable(),
    eventDate: z.coerce.date(),
    excerpt: z.string().trim().min(1).max(600),
    authors: z.array(z.string().trim().min(1).max(120)).max(80).default([]),
  })
  .refine((observation) => (observation.kind === 'DECISION') === (observation.decision !== null), {
    message: 'decision_must_match_kind',
    path: ['decision'],
  })

const payloadSchema = z.object({
  mailbox: z.string().trim().toLowerCase().email().max(200),
  observations: z.array(observationSchema).max(100),
})

export async function POST(request: NextRequest) {
  const agentToken = process.env.PUBLICATIONS_MAIL_AGENT_TOKEN
  if (!agentToken) {
    return NextResponse.json({ error: 'mail_agent_token_missing' }, { status: 500 })
  }
  if (!isAuthorizedCron(request.headers.get('authorization'), agentToken)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', issues: parsed.error.issues }, { status: 400 })
  }

  const results = await runAuditedOperation(
    { actorId: null, actorLabel: parsed.data.mailbox, source: 'MAIL_AGENT', summary: null, ipAddress: null },
    () => ingestMailObservations(parsed.data.mailbox, parsed.data.observations),
    (operation) => writeAuditOperation(prismaWithoutAudit, operation),
  )
  revalidateTag(PUBLICATIONS_MAIL_SUGGESTIONS_TAG)
  revalidateTag(PUBLICATIONS_ARTICLES_TAG)
  return NextResponse.json({ received: results.length, results })
}
