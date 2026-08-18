import { describe, expect, it } from 'vitest'
import { resolveAppBaseUrl, PRODUCTION_APP_URL } from './app-url'

describe('resolveAppBaseUrl', () => {
  it('always uses the custom domain in production, whatever the configured URL says', () => {
    expect(
      resolveAppBaseUrl({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_URL: 'https://larib-portal-abc123.vercel.app' }),
    ).toBe(PRODUCTION_APP_URL)
    expect(resolveAppBaseUrl({ VERCEL_ENV: 'production' })).toBe(PRODUCTION_APP_URL)
  })

  it('keeps the configured URL outside production and trims a trailing slash', () => {
    expect(resolveAppBaseUrl({ VERCEL_ENV: 'preview', NEXT_PUBLIC_APP_URL: 'https://preview.vercel.app/' })).toBe(
      'https://preview.vercel.app',
    )
    expect(resolveAppBaseUrl({ NEXT_PUBLIC_APP_URL: '  http://localhost:3100  ' })).toBe('http://localhost:3100')
  })

  it('falls back to localhost when nothing is configured', () => {
    expect(resolveAppBaseUrl({})).toBe('http://localhost:3000')
    expect(resolveAppBaseUrl({ NEXT_PUBLIC_APP_URL: '' })).toBe('http://localhost:3000')
  })
})
