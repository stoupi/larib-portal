import { COLORS, FONT_SANS, FONT_SERIF, emailLayout } from './layout'

export type PubmedAlertEmailPaper = {
  title: string
  journalName: string | null
  pmid: string
  articleUrl: string | null
}

export type PubmedAlertEmailParams = {
  locale: 'fr' | 'en'
  firstName: string | null
  autoLinked: PubmedAlertEmailPaper[]
  pending: PubmedAlertEmailPaper[]
  reviewUrl: string
}

const WORDS = {
  fr: {
    subject: (count: number) =>
      count > 1 ? `${count} nouvelles publications MIRACL.ai sur PubMed` : 'Nouvelle publication MIRACL.ai sur PubMed',
    eyebrow: 'Veille PubMed · MIRACL.ai',
    hello: (name: string | null) => (name ? `Bonjour ${name},` : 'Bonjour,'),
    lead: 'PubMed vient d’indexer des papiers signés avec l’affiliation MIRACL.ai.',
    autoLinked: 'Reliés automatiquement à leur publication',
    pending: 'À vérifier dans le portail',
    pubmed: 'Fiche PubMed',
    open: 'Ouvrir la publication',
    button: 'Ouvrir la veille PubMed',
    noJournal: 'revue non renseignée',
    footer: 'Ceci est un email automatique envoyé depuis Larib Portal.',
  },
  en: {
    subject: (count: number) =>
      count > 1 ? `${count} new MIRACL.ai publications on PubMed` : 'New MIRACL.ai publication on PubMed',
    eyebrow: 'PubMed watch · MIRACL.ai',
    hello: (name: string | null) => (name ? `Hello ${name},` : 'Hello,'),
    lead: 'PubMed has just indexed papers signed with the MIRACL.ai affiliation.',
    autoLinked: 'Linked to their publication automatically',
    pending: 'To review in the portal',
    pubmed: 'PubMed record',
    open: 'Open the publication',
    button: 'Open the PubMed watch',
    noJournal: 'no journal recorded',
    footer: 'This is an automatic email sent from Larib Portal.',
  },
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function pubmedUrl(pmid: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
}

export function renderPubmedAlertEmail({
  locale,
  firstName,
  autoLinked,
  pending,
  reviewUrl,
}: PubmedAlertEmailParams): { subject: string; text: string; html: string } {
  const words = WORDS[locale]
  const subject = words.subject(autoLinked.length + pending.length)

  const textSection = (heading: string, papers: PubmedAlertEmailPaper[]) =>
    papers.length === 0
      ? []
      : [
          heading,
          ...papers.map(
            (paper) => `- ${paper.title} — ${paper.journalName ?? words.noJournal} — ${paper.articleUrl ?? pubmedUrl(paper.pmid)}`,
          ),
          '',
        ]
  const text = [
    words.hello(firstName),
    '',
    words.lead,
    '',
    ...textSection(words.autoLinked, autoLinked),
    ...textSection(words.pending, pending),
    reviewUrl,
  ].join('\n')

  const link = (href: string, label: string) =>
    `<a href="${escapeHtml(href)}" target="_blank" style="color:${COLORS.accent};text-decoration:underline;">${escapeHtml(label)}</a>`

  const htmlSection = (heading: string, papers: PubmedAlertEmailPaper[]) =>
    papers.length === 0
      ? ''
      : `<p style="margin:0 0 10px 0;font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${COLORS.primary};">${escapeHtml(heading)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">${papers
      .map(
        (paper) => `<tr><td style="padding:11px 0;border-bottom:1px solid ${COLORS.border};font-family:${FONT_SANS};font-size:14px;line-height:21px;color:${COLORS.foreground};">
        <strong>${escapeHtml(paper.title)}</strong><br />
        <span style="font-size:13px;">${escapeHtml(paper.journalName ?? words.noJournal)} · ${link(pubmedUrl(paper.pmid), words.pubmed)}${paper.articleUrl ? ` · ${link(paper.articleUrl, words.open)}` : ''}</span>
      </td></tr>`,
      )
      .join('')}</table>`

  const body = `<p style="margin:0 0 8px 0;font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${COLORS.accent};">${escapeHtml(words.eyebrow)}</p>
    <p style="margin:0 0 12px 0;font-family:${FONT_SANS};font-size:15px;line-height:23px;color:${COLORS.foreground};">${escapeHtml(words.hello(firstName))}</p>
    <p style="margin:0 0 24px 0;font-family:${FONT_SERIF};font-size:20px;line-height:28px;font-weight:700;color:${COLORS.primary};">${escapeHtml(words.lead)}</p>
    ${htmlSection(words.autoLinked, autoLinked)}
    ${htmlSection(words.pending, pending)}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
      <td align="center" style="background-color:${COLORS.accent};border-radius:8px;">
        <a href="${escapeHtml(reviewUrl)}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(words.button)}</a>
      </td>
    </tr></table>`

  return { subject, text, html: emailLayout(body, subject, words.footer) }
}
