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
    { id: '1', title: 'AI in cardiac MRI', status: 'UNDER_REVIEW', journalName: 'JACC', since: '2026-07-02T00:00:00.000Z', waitingDays: 62 },
    { id: '2', title: 'Valve outcomes', status: 'IN_PREPARATION', journalName: null, since: null, waitingDays: null },
    { id: '3', title: 'Strain analysis', status: 'TO_RESUBMIT', journalName: 'EHJ', since: '2026-03-04T00:00:00.000Z', waitingDays: 182 },
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
          since: '2026-08-01T00:00:00.000Z',
          waitingDays: 32,
        },
      ],
      appUrl: 'https://portal.test',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('Survival &lt; 10% &amp; the &lt;script&gt;')
    expect(html).toContain('Heart &amp; Vessels &lt;Suppl&gt;')
  })
})

describe('portal branding', () => {
  it('shows the kind as a filled badge, not faint small caps', () => {
    const html = renderCarouselRequestEmailHtml('Bonjour Jeremy,\n\nFélicitations !')
    expect(html).toContain('border-radius:20px')
    expect(html).toContain('Nouvelle publication')
    expect(html).not.toContain('text-transform:uppercase;color:#ff5c82')
  })

  it('never signs an email as Cardio Larib', () => {
    const html = renderCarouselRequestEmailHtml('Bonjour Alice,\n\nFélicitations !')
    expect(html).not.toContain('Cardio Larib')
    expect(html).toContain('Larib Portal')
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

  it('bolds whatever sits between French quotes', () => {
    const html = renderCarouselRequestEmailHtml(
      'Bonjour Alice,\n\nFélicitations pour l’acceptation de ton article « Mitral valve repair » dans Circulation !',
    )
    expect(html).toContain('<strong>« Mitral valve repair »</strong>')
  })

  it('says the email is automatic', () => {
    const html = renderCarouselRequestEmailHtml('Bonjour Alice,\n\nFélicitations !')
    expect(html).toContain('email automatique')
  })

  it('leaves a body without quotes untouched', () => {
    const html = renderCarouselRequestEmailHtml('Bonjour Alice,\n\nFélicitations !')
    expect(html).not.toContain('<strong>')
  })
})

describe('the recap that chases what stalls', () => {
  const stalled: RecapArticle[] = [
    {
      id: 'r',
      title: 'Rejected and never sent back',
      status: 'TO_RESUBMIT',
      journalName: 'EHJ',
      since: '2026-03-04T00:00:00.000Z',
      waitingDays: 182,
    },
  ]

  it('keeps the subject free of a count that would read wrong in the singular', () => {
    const { subject } = renderPublicationsRecapEmail({
      locale: 'fr',
      firstName: 'Marie',
      articles: stalled,
      appUrl: 'https://portal.test',
    })
    expect(subject).toBe('Vos publications en cours — récap mensuel')
  })

  it('gives the papers to resubmit their own block, dated and aged', () => {
    const { html } = renderPublicationsRecapEmail({
      locale: 'fr',
      firstName: null,
      articles: stalled,
      appUrl: 'https://portal.test',
    })
    expect(html).toContain('À resoumettre')
    expect(html).toContain('04 mars 2026')
    expect(html).toContain('en attente depuis 6 mois')
  })

  it('opens on the acceptances, with the confetti', () => {
    const { html, text } = renderPublicationsRecapEmail({
      locale: 'fr',
      firstName: 'Marie',
      articles: [],
      celebrations: [
        { id: 'c', title: 'Accepted at last', journalName: 'JACC', acceptedAt: '2026-08-20T00:00:00.000Z' },
      ],
      appUrl: 'https://portal.test',
    })
    expect(html).toContain('🎉')
    expect(html).toContain('Félicitations')
    expect(html).toContain('Accepted at last')
    expect(text).toContain('Accepted at last')
  })

  it('says nothing about acceptances when there are none', () => {
    const { html } = renderPublicationsRecapEmail({
      locale: 'fr',
      firstName: 'Marie',
      articles: stalled,
      appUrl: 'https://portal.test',
    })
    expect(html).not.toContain('🎉')
  })

  it('asks for a correction and offers a reply address', () => {
    const { html } = renderPublicationsRecapEmail({
      locale: 'fr',
      firstName: 'Marie',
      articles: stalled,
      appUrl: 'https://portal.test',
      contactEmail: 'publications@larib.test',
    })
    expect(html).toContain('suivi du service')
    expect(html).toContain('mailto:publications@larib.test')
  })
})
