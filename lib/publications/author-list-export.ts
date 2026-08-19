export type ExportableAuthor = {
  firstName: string
  lastName: string
  degrees: string | null
  affiliations: string[]
}

export type ExportedAuthor = {
  name: string
  degrees: string[]
  affiliationIndexes: number[]
}

export type ExportedAffiliation = {
  index: number
  text: string
}

export type AuthorListExport = {
  title: string
  authors: ExportedAuthor[]
  affiliations: ExportedAffiliation[]
}

// An affiliation is the address line printed under a manuscript. It is never the
// author's centre de rattachement, which only groups authors inside the portal.
export type AuthorshipSource = {
  author: { id: string; firstName: string; lastName: string; degrees: string | null }
  affiliations: Array<{ affiliation: { name: string; raw: string | null } }>
}

export type ExportCandidate = {
  authorId: string
  firstName: string
  lastName: string
  degrees: string | null
  articleAffiliations: string[]
}

const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹']

export function articleAffiliationTexts(authorship: AuthorshipSource): string[] {
  return authorship.affiliations
    .map((link) => link.affiliation.raw?.trim() || link.affiliation.name.trim())
    .filter(Boolean)
}

export function toExportCandidates(authorships: AuthorshipSource[]): ExportCandidate[] {
  return authorships.map((authorship) => ({
    authorId: authorship.author.id,
    firstName: authorship.author.firstName,
    lastName: authorship.author.lastName,
    degrees: authorship.author.degrees,
    articleAffiliations: articleAffiliationTexts(authorship),
  }))
}

// What this article recorded for the author wins — that is what the paper itself
// says. Otherwise the author's own affiliations, resolved the way their sheet
// shows them: the ones on record, or the ones derived from their publications.
export function resolveExportableAuthors(
  candidates: ExportCandidate[],
  affiliationsByAuthorId: Record<string, string[]>,
): ExportableAuthor[] {
  return candidates.map((candidate) => ({
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    degrees: candidate.degrees,
    affiliations:
      candidate.articleAffiliations.length > 0
        ? candidate.articleAffiliations
        : affiliationsByAuthorId[candidate.authorId] ?? [],
  }))
}

function affiliationKey(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.$/, '')
    .toLowerCase()
}

function splitDegrees(degrees: string | null): string[] {
  if (!degrees) return []
  return degrees
    .split(/[,;]/)
    .map((degree) => degree.trim())
    .filter(Boolean)
}

export function buildAuthorListExport(title: string, authors: ExportableAuthor[]): AuthorListExport {
  const indexByKey = new Map<string, number>()
  const affiliations: ExportedAffiliation[] = []

  const exportedAuthors = authors.map((author) => {
    const affiliationIndexes: number[] = []
    for (const affiliation of author.affiliations) {
      const text = affiliation.replace(/\s+/g, ' ').trim()
      if (text === '') continue
      const key = affiliationKey(text)
      let index = indexByKey.get(key)
      if (index === undefined) {
        index = affiliations.length + 1
        indexByKey.set(key, index)
        affiliations.push({ index, text })
      }
      if (!affiliationIndexes.includes(index)) affiliationIndexes.push(index)
    }
    return {
      name: `${author.firstName} ${author.lastName}`.replace(/\s+/g, ' ').trim(),
      degrees: splitDegrees(author.degrees),
      affiliationIndexes,
    }
  })

  return { title: title.trim(), authors: exportedAuthors, affiliations }
}

function toSuperscript(indexes: number[]): string {
  return indexes
    .map((index) =>
      String(index)
        .split('')
        .map((digit) => SUPERSCRIPT_DIGITS[Number(digit)])
        .join(''),
    )
    .join(',')
}

function joinAuthorSegments(segments: string[]): string {
  if (segments.length === 0) return ''
  if (segments.length === 1) return `${segments[0]}.`
  const allButLast = segments.slice(0, -1).join('; ')
  return `${allButLast}; and ${segments[segments.length - 1]}.`
}

export function authorListExportToPlainText(authorList: AuthorListExport): string {
  const authorsLine = joinAuthorSegments(
    authorList.authors.map((author) => {
      const marks = toSuperscript(author.affiliationIndexes)
      const degrees = author.degrees.length > 0 ? `, ${author.degrees.join(', ')}` : ''
      return `${author.name}${marks}${degrees}`
    }),
  )
  const affiliationLines = authorList.affiliations.map(
    (affiliation) => `${toSuperscript([affiliation.index])} ${affiliation.text}`,
  )
  return [authorList.title, '', authorsLine, '', ...affiliationLines].join('\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function authorListExportToHtml(authorList: AuthorListExport): string {
  const authorsLine = joinAuthorSegments(
    authorList.authors.map((author) => {
      const marks =
        author.affiliationIndexes.length > 0
          ? `<sup>${author.affiliationIndexes.join(',')}</sup>`
          : ''
      const degrees = author.degrees.length > 0 ? `, ${escapeHtml(author.degrees.join(', '))}` : ''
      return `${escapeHtml(author.name)}${marks}${degrees}`
    }),
  )
  const affiliationLines = authorList.affiliations
    .map((affiliation) => `<p><sup>${affiliation.index}</sup> ${escapeHtml(affiliation.text)}</p>`)
    .join('')
  return [
    `<p style="text-align:center"><b>${escapeHtml(authorList.title)}</b></p>`,
    `<p style="text-align:center">${authorsLine}</p>`,
    affiliationLines,
  ].join('')
}
