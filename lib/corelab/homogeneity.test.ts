import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// The library and a study's CRF editor are one instrument seen from two places. These rules
// fail the build when a change lands on one side only, which is how the two drifted before.

const ROOT = path.resolve(__dirname, '../..')
const LIBRARY = 'app/[locale]/corelab/admin/library'
const EDITOR = 'app/[locale]/corelab/admin/studies/[studyId]/crf'
const SHARED = 'app/[locale]/corelab/components/crf'

function read(file: string): string {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
}

function sourcesOf(directory: string): Array<{ file: string; source: string }> {
  return fs
    .readdirSync(path.join(ROOT, directory))
    .filter((name) => name.endsWith('.tsx'))
    .map((name) => ({ file: `${directory}/${name}`, source: read(`${directory}/${name}`) }))
}

function definitionsIn(source: string): string[] {
  return [...source.matchAll(/export function ([A-Z][A-Za-z]*)/g)].map((match) => match[1])
}

const CHROME = ['PaneFrame', 'PaneBand', 'BandButton', 'StatStrip', 'Cap', 'PaneFooter', 'RailRow', 'EditorInput', 'MoveButtons', 'GripIcon']
const CONTROLS = ['ChoiceChip', 'LabelledInput', 'ValueSetChips', 'InspectorSection', 'WarningNote']

describe('one chrome for both screens', () => {
  it('defines each shared piece exactly once, in the shared module', () => {
    const owners = new Map<string, string[]>()
    for (const directory of [LIBRARY, EDITOR, SHARED]) {
      for (const { file, source } of sourcesOf(directory)) {
        for (const name of definitionsIn(source)) {
          if (![...CHROME, ...CONTROLS].includes(name)) continue
          owners.set(name, [...(owners.get(name) ?? []), file])
        }
      }
    }
    for (const name of CHROME) {
      expect(owners.get(name), `${name} must be defined once`).toEqual([`${SHARED}/pane-chrome.tsx`])
    }
    for (const name of CONTROLS) {
      expect(owners.get(name), `${name} must be defined once`).toEqual([`${SHARED}/field-controls.tsx`])
    }
  })

  it('leaves no screen-local chrome module behind', () => {
    const local = [...sourcesOf(LIBRARY), ...sourcesOf(EDITOR)].map((entry) => entry.file)
    expect(local).not.toContain(`${LIBRARY}/library-chrome.tsx`)
    expect(local).not.toContain(`${EDITOR}/crf-chrome.tsx`)
  })

  it('has both screens read the shared chrome', () => {
    const usesChrome = (entries: Array<{ source: string }>) =>
      entries.some((entry) => entry.source.includes('components/crf/pane-chrome'))
    expect(usesChrome(sourcesOf(LIBRARY)), 'the library must use the shared chrome').toBe(true)
    expect(usesChrome(sourcesOf(EDITOR)), 'the CRF editor must use the shared chrome').toBe(true)
  })
})

describe('one settings panel for a variable', () => {
  it('is rendered by both inspectors and written once', () => {
    expect(read(`${LIBRARY}/variable-inspector.tsx`)).toContain('VariableSettings')
    expect(read(`${EDITOR}/crf-inspector.tsx`)).toContain('VariableSettings')
    const definitions = [...sourcesOf(LIBRARY), ...sourcesOf(EDITOR), ...sourcesOf(SHARED)]
      .filter((entry) => entry.source.includes('export function VariableSettings'))
      .map((entry) => entry.file)
    expect(definitions).toEqual([`${SHARED}/variable-settings.tsx`])
  })
})

describe('one word for one thing', () => {
  const messages = (locale: 'fr' | 'en') => JSON.parse(read(`messages/${locale}.json`)).corelab

  // A key each screen spells the same way is one concept written twice: it will drift.
  // A key they spell differently is each screen's own word, and stays where it is.
  it('never writes the same sentence in both screen namespaces', () => {
    for (const locale of ['fr', 'en'] as const) {
      const corelab = messages(locale)
      const twice = Object.keys(corelab.library).filter(
        (key) => typeof corelab.library[key] === 'string' && corelab.library[key] === corelab.crfEditor[key],
      )
      expect(twice, `${locale}: move these to corelab.crf`).toEqual([])
    }
  })

  it('keeps every declared shared concept out of the screen namespaces', () => {
    const shared = Object.keys(messages('fr').crf)
    for (const locale of ['fr', 'en'] as const) {
      const corelab = messages(locale)
      for (const namespace of ['library', 'crfEditor'] as const) {
        const strays = shared.filter((key) => key in corelab[namespace])
        expect(strays, `${locale}: corelab.${namespace} must read these from corelab.crf`).toEqual([])
      }
    }
  })

  it('keeps the shared vocabulary at parity across locales', () => {
    const flatten = (value: unknown, prefix = ''): string[] =>
      typeof value === 'object' && value !== null
        ? Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => flatten(entry, `${prefix}${key}.`))
        : [prefix]
    for (const namespace of ['crf', 'library', 'crfEditor'] as const) {
      expect(flatten(messages('fr')[namespace]).sort(), `corelab.${namespace}`).toEqual(
        flatten(messages('en')[namespace]).sort(),
      )
    }
  })

  it('reads the shared vocabulary from corelab.crf on both sides', () => {
    const readsShared = (entries: Array<{ source: string }>) =>
      entries.some((entry) => entry.source.includes("useTranslations('corelab.crf')"))
    expect(readsShared(sourcesOf(LIBRARY)), 'the library must read corelab.crf').toBe(true)
    expect(readsShared(sourcesOf(EDITOR)), 'the CRF editor must read corelab.crf').toBe(true)
  })
})

// A key moved to the shared namespace leaves silent holes behind: next-intl only complains at
// render time. This walks every literal call on both screens and resolves it against both locales.
describe('every label these screens ask for exists', () => {
  const messages = (locale: 'fr' | 'en') => JSON.parse(read(`messages/${locale}.json`))

  function resolve(bundle: unknown, dotted: string): unknown {
    return dotted.split('.').reduce<unknown>(
      (node, key) => (typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[key] : undefined),
      bundle,
    )
  }

  it('resolves in French and in English', () => {
    const missing: string[] = []
    for (const directory of [LIBRARY, EDITOR, SHARED]) {
      for (const { file, source } of sourcesOf(directory)) {
        const namespaces = new Map<string, string>()
        for (const match of source.matchAll(/const (\w+) = useTranslations\('([^']+)'\)/g)) {
          namespaces.set(match[1], match[2])
        }
        for (const [variable, namespace] of namespaces) {
          const calls = new RegExp(`\\b${variable}\\('([A-Za-z0-9_.]+)'`, 'g')
          for (const call of source.matchAll(calls)) {
            const dotted = `${namespace}.${call[1]}`
            for (const locale of ['fr', 'en'] as const) {
              if (typeof resolve(messages(locale), dotted) !== 'string') missing.push(`${file}: ${dotted} (${locale})`)
            }
          }
        }
      }
    }
    expect(missing).toEqual([])
  })
})
