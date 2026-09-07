export type CodeProblem = { kind: 'TOO_SHORT' | 'CHARACTERS'; suggestion: string }

export function suggestCode(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

export function codeProblem(raw: string): CodeProblem | null {
  const code = raw.trim()
  if (code.length < 2) return { kind: 'TOO_SHORT', suggestion: suggestCode(code) }
  if (code.length > 50) return { kind: 'CHARACTERS', suggestion: suggestCode(code).slice(0, 50) }
  if (!/^[A-Z0-9-]+$/.test(code)) return { kind: 'CHARACTERS', suggestion: suggestCode(code) }
  return null
}
