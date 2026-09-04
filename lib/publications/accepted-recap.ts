export type AcceptedPaper = {
  id: string
  title: string
  journalName: string | null
  firstAuthorName: string | null
  // Papers imported from PubMed often carry no acceptance date, only a publication one.
  date: string
  published: boolean
}

// The window the recap covers. The very first run looks further back than a month, so the
// papers accepted before the recap existed are announced rather than silently skipped.
export function acceptedWindowStart(now: Date, months: number): Date {
  const start = new Date(now)
  start.setUTCMonth(start.getUTCMonth() - months)
  return start
}

export function selectAcceptedPapers(papers: AcceptedPaper[], since: Date): AcceptedPaper[] {
  return papers
    .filter((paper) => new Date(paper.date).getTime() >= since.getTime())
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
}
