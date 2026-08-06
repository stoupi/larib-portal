export type PubmedQueryPlan =
  | { kind: 'pmids'; pmids: string[] }
  | { kind: 'term'; term: string }

const PMID_LIST = /^[\d\s,;]+$/
const DOI = /10\.\d{4,9}\/\S+/i

export function pubmedQueryPlan(input: string): PubmedQueryPlan | null {
  const query = input.trim()
  if (query.length === 0) return null

  if (PMID_LIST.test(query)) {
    const pmids = query.split(/[\s,;]+/).filter(Boolean)
    return pmids.length > 0 ? { kind: 'pmids', pmids } : null
  }

  const doi = query.match(DOI)
  if (doi) return { kind: 'term', term: `"${doi[0].replace(/[.,;]$/, '')}"[AID]` }

  return { kind: 'term', term: query }
}
