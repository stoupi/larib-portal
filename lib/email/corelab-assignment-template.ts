import { COLORS, FONT_SANS, emailLayout } from './layout'

export type CorelabAssignmentEmailParams = {
  readerName: string
  studyName: string
  studyCode: string
  patientCount: number
  examCount: number
  dueDate: string
  pace: { amount: number; unit: 'week' | 'month' } | null
  readingsUrl: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function renderCorelabAssignmentEmail(
  params: CorelabAssignmentEmailParams,
): { subject: string; text: string; html: string } {
  const subject = `MIRACL Core Lab: ${params.patientCount} new patients assigned to you — ${params.studyName}`
  const paceLine = params.pace
    ? `Suggested pace: ${params.pace.amount} patients per ${params.pace.unit}.`
    : ''

  const text = [
    `Hello ${params.readerName},`,
    '',
    `${params.patientCount} patients (${params.examCount} exams) have been assigned to you on ${params.studyName} (${params.studyCode}).`,
    `Deadline: ${params.dueDate}.`,
    paceLine,
    '',
    `Open your readings: ${params.readingsUrl}`,
  ]
    .filter((line) => line !== '')
    .join('\n')

  const html = emailLayout(
    `
      <p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:16px;color:${COLORS.foreground};">Hello ${escapeHtml(params.readerName)},</p>
      <p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:15px;color:${COLORS.foreground};">
        <strong>${params.patientCount} patients</strong> (${params.examCount} exams) have been assigned to you on
        <strong>${escapeHtml(params.studyName)}</strong> (${escapeHtml(params.studyCode)}).
      </p>
      <p style="margin:0 0 8px;font-family:${FONT_SANS};font-size:15px;color:${COLORS.foreground};">Deadline: <strong>${escapeHtml(params.dueDate)}</strong>.</p>
      ${paceLine ? `<p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:15px;color:${COLORS.foreground};">${escapeHtml(paceLine)}</p>` : ''}
      <p style="margin:24px 0 0;"><a href="${params.readingsUrl}" style="font-family:${FONT_SANS};font-size:15px;color:${COLORS.primary};">Open my readings</a></p>
    `,
    subject,
  )

  return { subject, text, html }
}
