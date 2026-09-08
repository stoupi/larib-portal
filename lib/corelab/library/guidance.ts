export const GUIDANCE_PREFIX = 'corelab/library/guidance/'

export function guidanceImageUrl(imageKey: string): string {
  return `/api/corelab/uploads/guidance-image?key=${encodeURIComponent(imageKey)}`
}

export function isGuidanceKey(key: string): boolean {
  return key.startsWith(GUIDANCE_PREFIX) && !key.includes('..')
}
