const LINKEDIN_HOSTS = /^([a-z]{2}\.)?linkedin\.com$/

// LinkedIn writes the same post two ways: a share link ending in the activity id, and a
// feed URL carrying the URN. Both reduce to the one embed address.
const ACTIVITY_FROM_SHARE = /activity-(\d{6,})/
const ACTIVITY_FROM_URN = /urn:li:activity:(\d{6,})/

export function linkedinActivityId(rawUrl: string | null | undefined): string | null {
  const value = (rawUrl ?? '').trim()
  if (value === '') return null

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  if (!LINKEDIN_HOSTS.test(url.hostname.replace(/^www\./, ''))) return null

  const path = decodeURIComponent(url.pathname)
  const match = ACTIVITY_FROM_URN.exec(path) ?? ACTIVITY_FROM_SHARE.exec(path)
  return match ? match[1] : null
}

export function linkedinEmbedUrl(rawUrl: string | null | undefined): string | null {
  const activityId = linkedinActivityId(rawUrl)
  return activityId ? `https://www.linkedin.com/embed/feed/update/urn:li:activity:${activityId}` : null
}
