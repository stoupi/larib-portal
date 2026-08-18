import { describe, it, expect } from 'vitest'
import { renderLeaveRecapEmail, renderPublicationsRecapEmail, renderCarouselRequestEmailHtml } from './email'
import type { RecapArticle } from '@/lib/publications/recap'

describe('renderLeaveRecapEmail', () => {
  it('includes rows and a localized subject (FR weekly)', () => {
    const { subject, text, html } = renderLeaveRecapEmail({
      to: ['x@x.io'],
      locale: 'fr',
      period: 'weekly',
      rangeStart: new Date('2026-07-06T00:00:00'),
      rangeEnd: new Date('2026-07-10T23:59:59'),
      rows: [{
        userId: 'u1', name: 'Alice A', position: 'Doctor',
        startDate: new Date('2026-07-06T00:00:00'), endDate: new Date('2026-07-08T00:00:00'),
        status: 'PENDING', daysInRange: 3, remainingDays: 17,
      }],
    })
    expect(subject.toLowerCase()).toContain('semaine')
    expect(text).toContain('Alice A')
    expect(html).toContain('Alice A')
    expect(html).toContain('En attente')
    expect(html).toContain('Détail des congés')
    expect(html).toContain('17 jours restants')
  })

  it('shows an empty state when nobody is on leave (FR monthly)', () => {
    const { text, html } = renderLeaveRecapEmail({
      to: ['x@x.io'],
      locale: 'fr',
      period: 'monthly',
      rangeStart: new Date('2026-07-01T00:00:00'),
      rangeEnd: new Date('2026-07-31T23:59:59'),
      rows: [],
    })
    expect(text).toContain('Personne en congé')
    expect(html).toContain('Personne en congé')
  })
})

describe('renderPublicationsRecapEmail', () => {
  const articles: RecapArticle[] = [
    { id: '1', title: 'AI in cardiac MRI', status: 'UNDER_REVIEW', journalName: 'JACC', order: 1, totalAuthors: 6 },
    { id: '2', title: 'Valve outcomes', status: 'IN_PREPARATION', journalName: null, order: 3, totalAuthors: 4 },
    { id: '3', title: 'Strain analysis', status: 'TO_RESUBMIT', journalName: 'EHJ', order: 2, totalAuthors: 3 },
  ]

  it('renders French subject, statuses, journal fallback and app link', () => {
    const { subject, text, html } = renderPublicationsRecapEmail({
      locale: 'fr',
      firstName: 'Marie',
      articles,
      appUrl: 'https://portal.test',
    })
    expect(subject.toLowerCase()).toContain('publications')
    expect(text).toContain('AI in cardiac MRI')
    expect(text).toContain('En revue')
    expect(text).toContain('En préparation')
    expect(text).toContain('À resoumettre')
    expect(text).toContain('JACC')
    expect(text).toContain('aucun journal visé')
    expect(html).toContain('https://portal.test/fr/publications')
    expect(html).toContain('Marie')
    expect(html).toContain('1/6')
  })

  it('renders English labels for EN users without a first name', () => {
    const { subject, text, html } = renderPublicationsRecapEmail({
      locale: 'en',
      firstName: null,
      articles,
      appUrl: 'https://portal.test',
    })
    expect(subject.toLowerCase()).toContain('publications')
    expect(text).toContain('Under review')
    expect(text).toContain('In preparation')
    expect(text).toContain('To resubmit')
    expect(text).toContain('no target journal')
    expect(html).toContain('https://portal.test/en/publications')
    expect(html).toContain('Hello,')
  })

  it('escapes article titles and journal names in the HTML body', () => {
    const { html } = renderPublicationsRecapEmail({
      locale: 'en',
      firstName: 'Marie',
      articles: [
        {
          id: '1',
          title: 'Survival < 10% & the <script>alert(1)</script> case',
          status: 'UNDER_REVIEW',
          journalName: 'Heart & Vessels <Suppl>',
          order: 1,
          totalAuthors: 2,
        },
      ],
      appUrl: 'https://portal.test',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('Survival &lt; 10% &amp; the &lt;script&gt;')
    expect(html).toContain('Heart &amp; Vessels &lt;Suppl&gt;')
  })
})

describe('renderCarouselRequestEmailHtml', () => {
  const body = [
    'Bonjour Elsa,',
    '',
    'Félicitations pour l’acceptation de ton article « Valvular imaging » dans Circulation !',
    '',
    'Merci de transmettre les éléments suivants :',
    '',
    '- le PDF de l’article ;',
    '- quatre à six messages clés.',
    '',
    'Encore félicitations pour cette publication !',
  ].join('\n')

  it('lays the plain text out in the portal template: eyebrow, greeting, paragraphs and bullet block', () => {
    const html = renderCarouselRequestEmailHtml(body, '[Nouvelle publication] Préparation du post LinkedIn')
    expect(html).toContain('<!DOCTYPE html')
    expect(html).toContain('Nouvelle publication')
    expect(html).toContain('>Bonjour Elsa,</p>')
    expect(html).toContain('Georgia')
    expect(html).toContain('Circulation')
    expect(html).toContain('>le PDF de l’article ;</td>')
    expect(html).toContain('>quatre à six messages clés.</td>')
    expect(html).not.toContain('- le PDF')
    expect(html).toContain('Réponds directement à ce message')
    expect(html).not.toContain('ne pas r&eacute;pondre')
  })

  it('escapes HTML coming from the edited body', () => {
    const html = renderCarouselRequestEmailHtml('Bonjour,\n\n<script>alert("x & y")</script>')
    expect(html).toContain('&lt;script&gt;alert(&quot;x &amp; y&quot;)&lt;/script&gt;')
    expect(html).not.toContain('<script>')
  })
})
