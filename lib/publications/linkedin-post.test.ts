import { describe, it, expect } from 'vitest'
import { isLinkedinShortLink, linkedinEmbedUrl } from './linkedin-post'

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

describe('the other urn types LinkedIn hands out', () => {
  it('keeps a share urn rather than pretending it is an activity', () => {
    expect(linkedinEmbedUrl('https://www.linkedin.com/feed/update/urn:li:share:7100000000000000000')).toBe(
      'https://www.linkedin.com/embed/feed/update/urn:li:share:7100000000000000000',
    )
  })

  it('keeps a ugcPost urn', () => {
    expect(linkedinEmbedUrl('https://www.linkedin.com/feed/update/urn:li:ugcPost:7100000000000000000')).toBe(
      'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7100000000000000000',
    )
  })
})

describe('isLinkedinShortLink', () => {
  it('recognises the lnkd.in shortener, which hides the post behind a redirect', () => {
    expect(isLinkedinShortLink('https://lnkd.in/p/eWj-EGW8')).toBe(true)
    expect(isLinkedinShortLink('https://www.lnkd.in/eWj-EGW8')).toBe(true)
  })

  it('says no to a full LinkedIn address and to anything else', () => {
    expect(isLinkedinShortLink('https://www.linkedin.com/feed/update/urn:li:activity:7100000000000000000')).toBe(false)
    expect(isLinkedinShortLink('https://example.com/x')).toBe(false)
    expect(isLinkedinShortLink(null)).toBe(false)
  })
})

describe('the share link LinkedIn actually produces', () => {
  it('reads a ugcPost share link, tracking parameters and all', () => {
    expect(
      linkedinEmbedUrl(
        'https://www.linkedin.com/posts/stress-cmr-in-hypertension-ugcPost-7487418031036461056-txKX/?utm_source=social_share_send',
      ),
    ).toBe('https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7487418031036461056')
  })

  it('still reads the older activity share link', () => {
    expect(linkedinEmbedUrl('https://www.linkedin.com/posts/cardio-larib_activity-7100000000000000000-AbCd')).toBe(
      'https://www.linkedin.com/embed/feed/update/urn:li:activity:7100000000000000000',
    )
  })
})
