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

const WARNING = { background: '#fff4e6', border: '#e5a54b', badge: '#d97706', foreground: '#7c5e20' }

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

function paragraphs(value: string, color: string): string {
  return value
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block !== '')
    .map(
      (block) =>
        `<p style="margin:0 0 10px 0;font-family:${FONT_SANS};font-size:14px;line-height:22px;color:${color};">${escapeHtml(block).replaceAll('\n', '<br />')}</p>`,
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

  const isReport = kind === 'ERROR_REPORT'
  const badgeColor = isReport ? WARNING.badge : COLORS.accent
  const blockBackground = isReport ? WARNING.background : COLORS.secondary
  const blockBorder = isReport ? WARNING.border : COLORS.accent
  const labelColor = isReport ? WARNING.foreground : COLORS.primary
  // A round badge rather than the ⚠ character: every mail client draws a table cell,
  // not every one has the glyph.
  const warningBadge = isReport
    ? `<td width="22" valign="top" style="padding-right:10px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" width="22" height="22" style="width:22px;height:22px;background-color:${WARNING.badge};border-radius:11px;font-family:${FONT_SANS};font-size:14px;font-weight:700;color:#ffffff;line-height:22px;">!</td>
          </tr>
        </table>
      </td>`
    : ''

  const bodyBlock = body?.trim()
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
        <tr>
          <td style="background-color:${blockBackground};border-left:3px solid ${blockBorder};border-radius:4px;padding:18px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${warningBadge}
                <td>
                  <p style="margin:0 0 10px 0;font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${labelColor};">${escapeHtml(wording.bodyLabel)}</p>
                  ${paragraphs(body, isReport ? WARNING.foreground : COLORS.foreground)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`
    : ''

  const html = emailLayout(
    `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
      <tr>
        <td style="background-color:${badgeColor};border-radius:20px;padding:9px 18px;font-family:${FONT_SANS};font-size:14px;font-weight:700;color:#ffffff;letter-spacing:0.3px;white-space:nowrap;">
          ${escapeHtml(wording.eyebrow)}
        </td>
      </tr>
    </table>
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
