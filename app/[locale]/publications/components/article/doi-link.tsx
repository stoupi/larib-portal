import { ExternalLink } from 'lucide-react'
import { bareDoi, doiUrl } from '@/lib/publications/doi'

export function DoiLink({ doi }: { doi: string | null }) {
  const url = doiUrl(doi)
  if (!url) return <span className="text-sm text-text-primary">—</span>
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-coral-600 underline-offset-4 hover:underline dark:text-coral-300"
    >
      <span className="truncate">{bareDoi(doi)}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
    </a>
  )
}
