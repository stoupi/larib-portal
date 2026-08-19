import { describe, expect, it } from 'vitest'
import {
  authorListExportToHtml,
  authorListExportToPlainText,
  authorshipAffiliationTexts,
  buildAuthorListExport,
} from './author-list-export'

const LARIB = 'Université Paris Cité, Department of Cardiology, University Hospital of Lariboisiere, 75010, Paris, France.'
const ICPS = 'Institut Cardiovasculaire Paris Sud, Hôpital Privé Jacques CARTIER, 91300, Massy, France.'

describe('buildAuthorListExport', () => {
  it('numbers each affiliation once, in order of first appearance, and reuses it across authors', () => {
    const result = buildAuthorListExport('  Prognostic Value of CMR  ', [
      { firstName: 'Alexandre', lastName: 'Unger', degrees: 'MS', affiliations: [LARIB, ICPS] },
      { firstName: 'Jérôme', lastName: 'Garot', degrees: 'MD, PhD', affiliations: [ICPS] },
      { firstName: 'Solenn', lastName: 'Toupin', degrees: 'PhD', affiliations: [] },
    ])

    expect(result.title).toBe('Prognostic Value of CMR')
    expect(result.affiliations).toEqual([
      { index: 1, text: LARIB },
      { index: 2, text: ICPS },
    ])
    expect(result.authors).toEqual([
      { name: 'Alexandre Unger', degrees: ['MS'], affiliationIndexes: [1, 2] },
      { name: 'Jérôme Garot', degrees: ['MD', 'PhD'], affiliationIndexes: [2] },
      { name: 'Solenn Toupin', degrees: ['PhD'], affiliationIndexes: [] },
    ])
  })

  it('merges affiliations that differ only by case, spacing or a trailing period, and skips empty ones', () => {
    const result = buildAuthorListExport('T', [
      { firstName: 'A', lastName: 'One', degrees: null, affiliations: [LARIB, '   '] },
      { firstName: 'B', lastName: 'Two', degrees: null, affiliations: [`  ${LARIB.replace('.', '').toUpperCase()}  `] },
      { firstName: 'C', lastName: 'Three', degrees: null, affiliations: [LARIB, LARIB] },
    ])

    expect(result.affiliations).toHaveLength(1)
    expect(result.authors.map((author) => author.affiliationIndexes)).toEqual([[1], [1], [1]])
  })
})

describe('authorshipAffiliationTexts', () => {
  const author = { firstName: 'A', lastName: 'One', degrees: null, centre: { name: 'AP-HP - Lariboisière' } }

  it('prefers the raw address, then the affiliation name, then the linked centre', () => {
    expect(
      authorshipAffiliationTexts({
        author,
        affiliations: [
          { affiliation: { name: 'short name', raw: LARIB, centre: null } },
          { affiliation: { name: 'short name', raw: '  ', centre: null } },
          { affiliation: { name: '', raw: null, centre: { name: 'Centre only' } } },
        ],
      }),
    ).toEqual([LARIB, 'short name', 'Centre only'])
  })

  it("falls back to the author's own centre when the authorship carries no affiliation", () => {
    expect(authorshipAffiliationTexts({ author, affiliations: [] })).toEqual(['AP-HP - Lariboisière'])
    expect(authorshipAffiliationTexts({ author: { ...author, centre: null }, affiliations: [] })).toEqual([])
  })
})

describe('authorListExportToPlainText', () => {
  it('renders the Word layout with superscript marks and an "and" before the last author', () => {
    const text = authorListExportToPlainText(
      buildAuthorListExport('Prognostic Value of CMR', [
        { firstName: 'Alexandre', lastName: 'Unger', degrees: 'MS', affiliations: [LARIB, ICPS] },
        { firstName: 'Jérôme', lastName: 'Garot', degrees: 'MD, PhD', affiliations: [ICPS] },
        { firstName: 'Solenn', lastName: 'Toupin', degrees: 'PhD', affiliations: [LARIB] },
      ]),
    )

    expect(text).toBe(
      [
        'Prognostic Value of CMR',
        '',
        'Alexandre Unger¹,², MS; Jérôme Garot², MD, PhD; and Solenn Toupin¹, PhD.',
        '',
        `¹ ${LARIB}`,
        `² ${ICPS}`,
      ].join('\n'),
    )
  })

  it('ends a single-author list with a period and no "and"', () => {
    const text = authorListExportToPlainText(
      buildAuthorListExport('Solo', [
        { firstName: 'Solenn', lastName: 'Toupin', degrees: 'PhD', affiliations: [LARIB] },
      ]),
    )
    expect(text).toContain('Solenn Toupin¹, PhD.')
    expect(text).not.toContain('and')
  })
})

describe('authorListExportToHtml', () => {
  it('uses real sup tags so Word keeps the superscripts, and escapes the source text', () => {
    const html = authorListExportToHtml(
      buildAuthorListExport('Heart & <Lung>', [
        { firstName: 'Alexandre', lastName: 'Unger', degrees: 'MS', affiliations: [LARIB, ICPS] },
        { firstName: 'Jérôme', lastName: 'Garot', degrees: null, affiliations: [ICPS] },
      ]),
    )

    expect(html).toContain('<b>Heart &amp; &lt;Lung&gt;</b>')
    expect(html).toContain('Alexandre Unger<sup>1,2</sup>, MS; and Jérôme Garot<sup>2</sup>.')
    expect(html).toContain(`<p><sup>1</sup> ${LARIB}</p>`)
  })
})
