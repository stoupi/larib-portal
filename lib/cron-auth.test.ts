import { describe, expect, it } from 'vitest'
import { isAuthorizedCron } from './cron-auth'

describe('isAuthorizedCron', () => {
  it('accepts only the exact bearer secret', () => {
    expect(isAuthorizedCron('Bearer s3cret', 's3cret')).toBe(true)
    expect(isAuthorizedCron('Bearer wrong', 's3cret')).toBe(false)
    expect(isAuthorizedCron(null, 's3cret')).toBe(false)
    expect(isAuthorizedCron('Bearer s3cret', undefined)).toBe(false)
  })
})
