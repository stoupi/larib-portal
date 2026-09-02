import { describe, expect, it } from 'vitest'
import { buildTrainingVideoKey, isAcceptedVideo, VIDEO_MAX_BYTES } from './video'

describe('buildTrainingVideoKey', () => {
  it('cleans the file name and keeps it under the module', () => {
    const key = buildTrainingVideoKey('mod-1', 'Séance 1 — intro (final).MP4')
    expect(key).toMatch(/^corelab\/training\/mod-1\/\d+-seance-1-intro-final\.mp4$/)
  })
  it('never lets a path escape the module folder', () => {
    expect(buildTrainingVideoKey('mod-1', '../../etc/passwd.mp4')).not.toContain('..')
  })
})

describe('isAcceptedVideo', () => {
  it('accepts mp4 and webm under the size limit', () => {
    expect(isAcceptedVideo('video/mp4', 1024)).toBe(true)
    expect(isAcceptedVideo('video/webm', VIDEO_MAX_BYTES)).toBe(true)
  })
  it('refuses another container and an oversized file', () => {
    expect(isAcceptedVideo('video/x-msvideo', 1024)).toBe(false)
    expect(isAcceptedVideo('video/mp4', VIDEO_MAX_BYTES + 1)).toBe(false)
  })
})
