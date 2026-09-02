import { describe, it, expect } from 'vitest'
import { linkedinEmbedUrl } from './linkedin-post'

const EMBED = 'https://www.linkedin.com/embed/feed/update/urn:li:activity:7100000000000000000'

describe('linkedinEmbedUrl', () => {
  it('derives the embed from a share URL', () => {
    expect(linkedinEmbedUrl('https://www.linkedin.com/posts/cardio-larib_activity-7100000000000000000-AbCd')).toBe(EMBED)
  })

  it('derives the embed from a feed update URL', () => {
    expect(linkedinEmbedUrl('https://www.linkedin.com/feed/update/urn:li:activity:7100000000000000000/')).toBe(EMBED)
  })

  it('accepts the mobile host and a query string', () => {
    expect(linkedinEmbedUrl('https://fr.linkedin.com/feed/update/urn:li:activity:7100000000000000000?utm=x')).toBe(EMBED)
  })

  it('accepts a link pasted with spaces around it', () => {
    expect(linkedinEmbedUrl('  https://www.linkedin.com/feed/update/urn:li:activity:7100000000000000000  ')).toBe(EMBED)
  })

  it('returns null on a URL it cannot read', () => {
    expect(linkedinEmbedUrl('https://example.com/post/42')).toBeNull()
    expect(linkedinEmbedUrl('https://www.linkedin.com/company/cardio-larib')).toBeNull()
    expect(linkedinEmbedUrl('')).toBeNull()
    expect(linkedinEmbedUrl(null)).toBeNull()
  })

  it('refuses a look-alike host', () => {
    expect(linkedinEmbedUrl('https://linkedin.com.evil.test/feed/update/urn:li:activity:7100000000000000000')).toBeNull()
  })
})
