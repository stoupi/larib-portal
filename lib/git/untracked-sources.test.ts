import { describe, expect, it } from 'vitest'
import { findUntrackedSources, isSourcePath } from './untracked-sources'

describe('isSourcePath', () => {
  it('accepts source files inside the application directories', () => {
    expect(isSourcePath('lib/services/publications/duplicates.ts')).toBe(true)
    expect(isSourcePath('app/[locale]/publications/page.tsx')).toBe(true)
    expect(isSourcePath('components/ui/button.tsx')).toBe(true)
    expect(isSourcePath('messages/fr.json')).toBe(true)
    expect(isSourcePath('prisma/schema.prisma')).toBe(true)
    expect(isSourcePath('scripts/backfill-user-names.ts')).toBe(true)
  })

  it('ignores files outside those directories', () => {
    expect(isSourcePath('scratchpad/notes.ts')).toBe(false)
    expect(isSourcePath('README.md')).toBe(false)
    expect(isSourcePath('tests/e2e/publications.spec.ts')).toBe(false)
  })

  it('ignores non-source files even inside them', () => {
    expect(isSourcePath('app/screenshot.png')).toBe(false)
    expect(isSourcePath('lib/notes.md')).toBe(false)
  })

  it('does not match a directory whose name merely starts like a source one', () => {
    expect(isSourcePath('libraries/thing.ts')).toBe(false)
    expect(isSourcePath('apps/web/page.tsx')).toBe(false)
  })
})

describe('findUntrackedSources', () => {
  it('reports the never-staged service that broke the production build', () => {
    const untracked = [
      'lib/services/publications/duplicates.ts',
      'scratchpad/scratch.ts',
      'docs/plan.md',
    ]

    expect(findUntrackedSources(untracked)).toEqual(['lib/services/publications/duplicates.ts'])
  })

  it('returns every offender sorted, so the message is stable', () => {
    const untracked = ['types/publications.ts', 'actions/safe-action.ts', 'app/page.tsx']

    expect(findUntrackedSources(untracked)).toEqual([
      'actions/safe-action.ts',
      'app/page.tsx',
      'types/publications.ts',
    ])
  })

  it('tolerates the blank and padded lines git status can emit', () => {
    expect(findUntrackedSources(['', '  lib/a.ts  ', '\n'])).toEqual(['lib/a.ts'])
  })

  it('stays silent when nothing is missing', () => {
    expect(findUntrackedSources([])).toEqual([])
    expect(findUntrackedSources(['README.md'])).toEqual([])
  })
})
