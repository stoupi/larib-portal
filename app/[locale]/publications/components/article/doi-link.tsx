import { ExternalLink } from 'lucide-react'
import { bareDoi, doiUrl } from '@/lib/publications/doi'
import { barePubmedId, pubmedUrl } from '@/lib/publications/pubmed-id'

function IdentifierLink({ label, url }: { label: string | null; url: string | null }) {
  if (!url || !label) return <span className="text-sm text-text-primary">—</span>
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-coral-600 underline-offset-4 hover:underline dark:text-coral-300"
    >
      <span className="truncate">{label}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
    </a>
  )
}

export function DoiLink({ doi }: { doi: string | null }) {
  return <IdentifierLink label={bareDoi(doi)} url={doiUrl(doi)} />
}

export function PubmedLink({ pubmedId }: { pubmedId: string | null }) {
  const identifier = barePubmedId(pubmedId)
  // A value that is not a usable PMID is still shown, just not as a link.
  if (!identifier && pubmedId?.trim()) return <span className="text-sm text-text-primary">{pubmedId}</span>
  return <IdentifierLink label={identifier} url={pubmedUrl(pubmedId)} />
}
