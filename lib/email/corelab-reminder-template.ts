import { COLORS, FONT_SANS, emailLayout } from './layout'

export type ReminderEmailParams = {
  personName: string
  items: Array<{ label: string; kind: string; dueDate: string }>
  portalUrl: string
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function renderCorelabReminderEmail(params: ReminderEmailParams): { subject: string; text: string; html: string } {
  const subject = `MIRACL Core Lab: ${params.items.length} deadlines need your attention`
  const lines = params.items.map((item) => `- ${item.kind}: ${item.label} — due ${item.dueDate}`)

  const text = [`Hello ${params.personName},`, '', ...lines, '', `Open Core Lab: ${params.portalUrl}`].join('\n')
  const html = emailLayout(
    `
      <p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:16px;color:${COLORS.foreground};">Hello ${escapeHtml(params.personName)},</p>
      <ul style="margin:0 0 16px;padding-left:18px;font-family:${FONT_SANS};font-size:15px;color:${COLORS.foreground};">
        ${params.items.map((item) => `<li>${escapeHtml(item.kind)}: <strong>${escapeHtml(item.label)}</strong> — due ${escapeHtml(item.dueDate)}</li>`).join('')}
      </ul>
      <p style="margin:24px 0 0;"><a href="${params.portalUrl}" style="font-family:${FONT_SANS};font-size:15px;color:${COLORS.primary};">Open Core Lab</a></p>
    `,
    subject,
  )
  return { subject, text, html }
}
