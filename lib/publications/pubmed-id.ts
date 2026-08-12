// A PMID is stored as bare digits, but an import or a paste can carry the
// "PMID:" prefix or the whole PubMed URL, so links keep only the digits.
export function barePubmedId(pubmedId: string | null): string | null {
  if (!pubmedId) return null
  const digits = pubmedId.trim().replace(/^pmid:?\s*/i, '').replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//i, '').replace(/\/$/, '')
  return /^\d+$/.test(digits) ? digits : null
}

export function pubmedUrl(pubmedId: string | null): string | null {
  const identifier = barePubmedId(pubmedId)
  return identifier ? `https://pubmed.ncbi.nlm.nih.gov/${identifier}/` : null
}
