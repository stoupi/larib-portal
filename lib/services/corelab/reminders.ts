import { prisma } from '@/lib/prisma'
import { dueReminders, lateItems, type ReminderItem } from '@/lib/corelab/reminders/select'
import { renderCorelabReminderEmail } from '@/lib/email/corelab-reminder-template'

async function collectItems(): Promise<Array<ReminderItem & { email: string; name: string }>> {
  const [assignments, memberships] = await Promise.all([
    prisma.corelabReadingAssignment.findMany({
      where: { status: { in: ['ASSIGNED', 'IN_PROGRESS', 'RETURNED'] }, dueDate: { not: null } },
      select: {
        id: true, userId: true, role: true, dueDate: true,
        patient: { select: { code: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.corelabStudyMembership.findMany({
      where: {
        removedAt: null,
        OR: [{ trainingDueAt: { not: null } }, { calibrationDueAt: { not: null } }],
        certificationPhase: { in: ['TRAINING', 'CALIBRATION'] },
      },
      select: {
        id: true, userId: true, certificationPhase: true, trainingDueAt: true, calibrationDueAt: true,
        study: { select: { code: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    }),
  ])

  const nameOf = (user: { email: string; firstName: string | null; lastName: string | null }) =>
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email

  return [
    ...assignments.map((assignment) => ({
      userId: assignment.userId,
      kind: assignment.role === 'REVIEWER' ? ('REVIEW' as const) : ('READING' as const),
      entityId: assignment.id,
      label: assignment.patient.code,
      dueDate: assignment.dueDate,
      email: assignment.user.email,
      name: nameOf(assignment.user),
    })),
    ...memberships.map((membership) => ({
      userId: membership.userId,
      kind: membership.certificationPhase === 'TRAINING' ? ('TRAINING' as const) : ('CALIBRATION' as const),
      entityId: membership.id,
      label: membership.study.code,
      dueDate: membership.certificationPhase === 'TRAINING' ? membership.trainingDueAt : membership.calibrationDueAt,
      email: membership.user.email,
      name: nameOf(membership.user),
    })),
  ]
}

export async function sendDeadlineReminders(
  origin: string,
  now = new Date(),
): Promise<{ people: number; reminders: number; recapSentTo: number }> {
  const items = await collectItems()
  const startOfDay = new Date(now)
  startOfDay.setUTCHours(0, 0, 0, 0)

  const sentToday = await prisma.corelabReminderLog.findMany({
    where: { sentAt: { gte: startOfDay } },
    select: { userId: true, kind: true, entityId: true },
  })
  const alreadySent = new Set(sentToday.map((entry) => `${entry.userId}|${entry.kind}|${entry.entityId}`))

  const groups = dueReminders(items, alreadySent, now)
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM || 'noreply@your-domain.com'
  let reminders = 0

  for (const group of groups) {
    const person = items.find((item) => item.userId === group.userId)
    if (!person) continue

    const { subject, text, html } = renderCorelabReminderEmail({
      personName: person.name,
      items: group.items.map((item) => ({
        label: item.label,
        kind: item.kind,
        dueDate: item.dueDate ? item.dueDate.toISOString().slice(0, 10) : '',
      })),
      portalUrl: `${origin}/en/corelab`,
    })

    if (apiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `Larib Portal <${fromEmail}>`, to: [person.email], subject, text, html }),
      })
    }

    for (const item of group.items) {
      await prisma.corelabReminderLog.create({
        data: { userId: item.userId, kind: item.kind, entityId: item.entityId },
        select: { id: true },
      })
      reminders += 1
    }
  }

  const late = lateItems(items, now)
  const recapSentTo = late.length === 0 ? 0 : await sendRecap(late, items, origin, startOfDay, apiKey, fromEmail)

  return { people: groups.length, reminders, recapSentTo }
}

async function sendRecap(
  late: ReminderItem[],
  items: Array<ReminderItem & { email: string; name: string }>,
  origin: string,
  startOfDay: Date,
  apiKey: string | undefined,
  fromEmail: string,
): Promise<number> {
  const dataManagers = await prisma.user.findMany({
    where: { adminApplications: { has: 'CORELAB' } },
    select: { id: true, email: true, firstName: true, lastName: true },
  })
  const alreadySent = await prisma.corelabReminderLog.findMany({
    where: { kind: 'DM_RECAP', entityId: 'daily', sentAt: { gte: startOfDay } },
    select: { userId: true },
  })
  const done = new Set(alreadySent.map((entry) => entry.userId))
  const nameOf = new Map(items.map((item) => [item.userId, item.name]))

  let sent = 0
  for (const manager of dataManagers) {
    if (done.has(manager.id)) continue

    const { subject, text, html } = renderCorelabReminderEmail({
      personName: [manager.firstName, manager.lastName].filter(Boolean).join(' ').trim() || manager.email,
      items: late.map((item) => ({
        label: `${item.label} — ${nameOf.get(item.userId) ?? item.userId}`,
        kind: item.kind,
        dueDate: item.dueDate ? item.dueDate.toISOString().slice(0, 10) : '',
      })),
      portalUrl: `${origin}/en/corelab/admin`,
    })

    if (apiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `Larib Portal <${fromEmail}>`, to: [manager.email], subject, text, html }),
      })
    }

    await prisma.corelabReminderLog.create({
      data: { userId: manager.id, kind: 'DM_RECAP', entityId: 'daily' },
      select: { id: true },
    })
    sent += 1
  }
  return sent
}
