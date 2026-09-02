export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const
export const VIDEO_MAX_BYTES = 2 * 1024 * 1024 * 1024

const ACCENTS = /[̀-ͯ]/g

export function buildTrainingVideoKey(moduleId: string, fileName: string): string {
  const baseName = fileName.split(/[\\/]/).pop() ?? fileName
  const dot = baseName.lastIndexOf('.')
  const stem = dot > 0 ? baseName.slice(0, dot) : baseName
  const extension = dot > 0 ? baseName.slice(dot + 1).toLowerCase() : 'mp4'
  const cleanStem = stem
    .normalize('NFD')
    .replace(ACCENTS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const cleanExtension = extension.replace(/[^a-z0-9]/g, '')
  return `corelab/training/${moduleId}/${Date.now()}-${cleanStem || 'video'}.${cleanExtension || 'mp4'}`
}

export function isAcceptedVideo(mimeType: string, size: number): boolean {
  if (!VIDEO_MIME_TYPES.some((accepted) => accepted === mimeType)) return false
  return size > 0 && size <= VIDEO_MAX_BYTES
}
