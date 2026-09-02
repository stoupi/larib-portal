import { COLORS, FONT_SANS, FONT_SERIF, emailLayout } from './layout'
import {
  CAROUSEL_CONTACT_FIRST_NAME,
  CAROUSEL_EMAIL_EYEBROW,
  CAROUSEL_EMAIL_SUBJECT,
} from '@/lib/publications/carousel-email'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

const CAROUSEL_BULLET = /^[-\u2022]\s+/
const CAROUSEL_QUOTED_SEGMENT = /\u00ab[^\u00bb]*\u00bb/g

function boldQuotedSegments(escapedLine: string): string {
  return escapedLine.replace(CAROUSEL_QUOTED_SEGMENT, (quotedSegment) => `<strong>${quotedSegment}</strong>`)
}

function renderCarouselParagraph(block: string): string {
  const lines = block.split('\n').map((line) => boldQuotedSegments(escapeHtml(line.trim())))
  return `<p style="margin:0 0 16px 0;font-family:${FONT_SANS};font-size:15px;line-height:24px;color:${COLORS.foreground};">${lines.join('<br />')}</p>`
}

function renderCarouselList(block: string): string {
  const items = block
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => escapeHtml(line.replace(CAROUSEL_BULLET, '').trim()))
    .map(
      (item) => `<tr>
            <td width="16" valign="top" style="padding:0 0 12px 0;"><div style="width:6px;height:6px;margin-top:8px;background-color:${COLORS.accent};border-radius:3px;font-size:0;line-height:0;">&nbsp;</div></td>
            <td style="padding:0 0 12px 10px;font-family:${FONT_SANS};font-size:14px;line-height:22px;color:${COLORS.foreground};">${item}</td>
          </tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.secondary};border-radius:10px;margin:0 0 22px 0;">
      <tr>
        <td style="padding:20px 22px 8px 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
        </td>
      </tr>
    </table>`
}

// The admin edits the email as plain text, so the layout is rebuilt from it: the
// first block greets, "- " blocks become the highlighted checklist, the rest are
// paragraphs.
export function renderCarouselRequestEmailHtml(body: string, subject = CAROUSEL_EMAIL_SUBJECT): string {
  const [greetingBlock, ...blocks] = body.split(/\n\s*\n/).filter((block) => block.trim() !== '')
  const greeting = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
      <tr>
        <td style="background-color:${COLORS.accent};border-radius:20px;padding:9px 18px;font-family:${FONT_SANS};font-size:14px;font-weight:700;color:#ffffff;letter-spacing:0.3px;white-space:nowrap;">${escapeHtml(CAROUSEL_EMAIL_EYEBROW)}</td>
      </tr>
    </table>
    <p style="margin:0 0 20px 0;font-family:${FONT_SERIF};font-size:24px;line-height:32px;font-weight:700;color:${COLORS.primary};">${escapeHtml((greetingBlock ?? '').trim())}</p>`
  const content = blocks
    .map((block) =>
      block.split('\n').every((line) => line.trim() === '' || CAROUSEL_BULLET.test(line.trim()))
        ? renderCarouselList(block)
        : renderCarouselParagraph(block),
    )
    .join('')
  const footerNote = `Réponds directement à ce message pour transmettre tes éléments à ${escapeHtml(CAROUSEL_CONTACT_FIRST_NAME)}. Ceci est un email automatique envoyé depuis Larib Portal.`
  // The inbox preview reads better with the congratulations line than with the subject again.
  const preheader = escapeHtml((blocks.at(0) ?? subject).replaceAll('\n', ' ').trim())
  return emailLayout(`${greeting}${content}`, preheader, footerNote)
}
