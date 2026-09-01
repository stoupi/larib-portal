import { COLORS, FONT_SANS, FONT_SERIF, emailLayout } from './layout'

export type PublicationRequestKindValue = 'AUTHOR_LIST' | 'ERROR_REPORT'

export type PublicationRequestEmailParams = {
  kind: PublicationRequestKindValue
  articleTitle: string
  requesterName: string
  body: string | null
  articleUrl: string
}

const UNTITLED = 'Publication sans titre'

const WORDING: Record<
  PublicationRequestKindValue,
  { eyebrow: string; subject: string; intro: (name: string) => string; bodyLabel: string; cta: string }
> = {
  AUTHOR_LIST: {
    eyebrow: 'Demande de liste d’auteurs',
    subject: 'Demande de liste d’auteurs',
    intro: (name) => `${name} demande que la liste d’auteurs de cette publication soit complétée.`,
    bodyLabel: 'Contributeurs signalés',
    cta: 'Compléter la liste d’auteurs',
  },
  ERROR_REPORT: {
    eyebrow: 'Signalement d’erreur',
    subject: 'Signalement sur une publication',
    intro: (name) => `${name} signale une erreur sur cette publication.`,
    bodyLabel: 'Message',
    cta: 'Ouvrir la publication',
  },
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function paragraphs(value: string): string {
  return value
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block !== '')
    .map(
      (block) =>
        `<p style="margin:0 0 10px 0;font-family:${FONT_SANS};font-size:14px;line-height:22px;color:${COLORS.foreground};">${escapeHtml(block).replaceAll('\n', '<br />')}</p>`,
    )
    .join('')
}

export function renderPublicationRequestEmail({
  kind,
  articleTitle,
  requesterName,
  body,
  articleUrl,
}: PublicationRequestEmailParams): { subject: string; text: string; html: string } {
  const wording = WORDING[kind]
  const title = articleTitle.trim() || UNTITLED
  const intro = wording.intro(requesterName)

  const subject = `${wording.subject} — ${title}`
  const text = [intro, body ? `${wording.bodyLabel} :\n${body}` : null, articleUrl]
    .filter((part): part is string => part !== null)
    .join('\n\n')

  const bodyBlock = body?.trim()
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
        <tr>
          <td style="background-color:${COLORS.secondary};border-left:3px solid ${COLORS.accent};border-radius:4px;padding:18px 20px;">
            <p style="margin:0 0 10px 0;font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${COLORS.primary};">${escapeHtml(wording.bodyLabel)}</p>
            ${paragraphs(body)}
          </td>
        </tr>
      </table>`
    : ''

  const html = emailLayout(
    `
    <p style="margin:0 0 8px 0;font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${COLORS.accent};">
      ${escapeHtml(wording.eyebrow)}
    </p>
    <p style="margin:0 0 20px 0;font-family:${FONT_SERIF};font-size:24px;line-height:32px;font-weight:700;color:${COLORS.primary};">
      ${escapeHtml(title)}
    </p>
    <p style="margin:0 0 24px 0;font-family:${FONT_SANS};font-size:15px;line-height:24px;color:${COLORS.foreground};">
      ${escapeHtml(intro)}
    </p>
    ${bodyBlock}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="background-color:${COLORS.accent};border-radius:8px;">
                <a href="${escapeHtml(articleUrl)}" target="_blank" style="display:inline-block;padding:15px 40px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                  ${escapeHtml(wording.cta)}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`,
    escapeHtml(intro),
    'Ceci est un email automatique envoyé depuis Larib Portal.',
  )

  return { subject, text, html }
}
