const LINKEDIN_HOSTS = /^([a-z]{2}\.)?linkedin\.com$/
const LINKEDIN_SHORT_HOST = 'lnkd.in'

// A post is addressed by one of three urn types depending on how it was created, and
// the embed keeps whichever one the link carried.
const URN_TYPES = ['activity', 'share', 'ugcPost'] as const
type UrnType = (typeof URN_TYPES)[number]

const URN_IN_PATH = new RegExp(`urn:li:(${URN_TYPES.join('|')}):(\\d{6,})`)
const TYPE_IN_SHARE = new RegExp(`(${URN_TYPES.join('|')})-(\\d{6,})`)

export type LinkedinPostRef = { type: UrnType; id: string }

function parsed(rawUrl: string | null | undefined): URL | null {
  const value = (rawUrl ?? '').trim()
  if (value === '') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

// A shortened link hides the post behind a redirect: nothing can be read from it here.
export function isLinkedinShortLink(rawUrl: string | null | undefined): boolean {
  const url = parsed(rawUrl)
  return url?.hostname.replace(/^www\./, '') === LINKEDIN_SHORT_HOST
}

export function linkedinPostRef(rawUrl: string | null | undefined): LinkedinPostRef | null {
  const url = parsed(rawUrl)
  if (!url) return null
  if (!LINKEDIN_HOSTS.test(url.hostname.replace(/^www\./, ''))) return null

  const path = decodeURIComponent(url.pathname)
  const urn = URN_IN_PATH.exec(path)
  if (urn) return { type: urn[1] as UrnType, id: urn[2] }

  const share = TYPE_IN_SHARE.exec(path)
  return share ? { type: share[1] as UrnType, id: share[2] } : null
}

export function linkedinEmbedUrl(rawUrl: string | null | undefined): string | null {
  const ref = linkedinPostRef(rawUrl)
  return ref ? `https://www.linkedin.com/embed/feed/update/urn:li:${ref.type}:${ref.id}` : null
}
