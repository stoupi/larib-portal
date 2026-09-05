import { COLORS, FONT_SANS, emailLayout } from './layout'

export type ReviewEmailParams = {
  kind: 'REVIEW_READY' | 'REWORK_REQUESTED'
  personName: string
  studyName: string
  dueDate: string | null
  url: string
}

const WORDING = {
  REVIEW_READY: {
    subject: (study: string) => `MIRACL Core Lab: a patient awaits your adjudication — ${study}`,
    intro: 'Both readers have signed. The patient is ready for your adjudication.',
    cta: 'Open my reviews',
  },
  REWORK_REQUESTED: {
    subject: (study: string) => `MIRACL Core Lab: rework requested on one of your readings — ${study}`,
    intro: 'The reviewer asks you to revisit part of a reading. The points to correct are listed on the reading screen.',
    cta: 'Open my readings',
  },
} as const

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function renderCorelabReviewEmail(params: ReviewEmailParams): { subject: string; text: string; html: string } {
  const wording = WORDING[params.kind]
  const subject = wording.subject(params.studyName)
  const deadline = params.dueDate ? `Deadline: ${params.dueDate}.` : ''

  const text = [`Hello ${params.personName},`, '', wording.intro, deadline, '', `${wording.cta}: ${params.url}`]
    .filter((line, index) => line !== '' || index === 1 || index === 4)
    .join('\n')

  const html = emailLayout(
    `
      <p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:16px;color:${COLORS.foreground};">Hello ${escapeHtml(params.personName)},</p>
      <p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:15px;color:${COLORS.foreground};">${wording.intro}</p>
      ${deadline ? `<p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:15px;color:${COLORS.foreground};">${escapeHtml(deadline)}</p>` : ''}
      <p style="margin:24px 0 0;"><a href="${params.url}" style="font-family:${FONT_SANS};font-size:15px;color:${COLORS.primary};">${wording.cta}</a></p>
    `,
    subject,
  )

  return { subject, text, html }
}
