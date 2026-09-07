import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '..')

class DCLogic {
  constructor(props) {
    this.props = props || {}
    this.state = {}
  }
  setState(patch) {
    Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch)
  }
  forceUpdate() {}
}

const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g

/** Follows a dotted path the way the runtime does, reporting misses. */
function lookup(values, path) {
  if (path.startsWith('$') || path === 'true' || path === 'false') return { ok: true }
  let cursor = values
  for (const segment of path.split('.')) {
    if (cursor === null || cursor === undefined) return { ok: false }
    if (!(segment in cursor)) return { ok: false }
    cursor = cursor[segment]
  }
  return { ok: true, value: cursor }
}

const files = (await readdir(outDir)).filter((name) => name.endsWith('.dc.html')).sort()
let failures = 0

for (const file of files) {
  const source = await readFile(join(outDir, file), 'utf8')
  const problems = []

  if (!source.includes('<script src="./support.js"></script>')) problems.push('missing support.js head line')
  if (!source.includes('<x-dc>')) problems.push('missing <x-dc>')

  const templateMatch = source.match(/<x-dc>([\s\S]*?)<\/x-dc>/)
  const scriptMatch = source.match(/<script data-dc-script data-props='([^']*)'>([\s\S]*?)<\/script>/)

  if (!templateMatch) problems.push('no template block')
  if (!scriptMatch) problems.push('no logic block')

  let values = null
  if (scriptMatch) {
    const rawProps = scriptMatch[1]
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
    try {
      JSON.parse(rawProps || '{}')
    } catch (error) {
      problems.push(`data-props is not valid JSON: ${error.message}`)
    }
    try {
      const factory = new Function('DCLogic', `${scriptMatch[2]}\nreturn Component;`)
      const Component = factory(DCLogic)
      const defaults = {}
      for (const [key, spec] of Object.entries(JSON.parse(rawProps || '{}'))) {
        if (spec && 'default' in spec) defaults[key] = spec.default
      }
      const instance = new Component(defaults)
      values = instance.renderVals ? instance.renderVals() : {}
    } catch (error) {
      problems.push(`logic threw: ${error.message}`)
    }
  }

  if (values && templateMatch) {
    const scopes = new Set()
    for (const match of templateMatch[1].matchAll(/<sc-for[^>]*\bas="([^"]+)"/g)) scopes.add(match[1])
    const missing = new Set()
    for (const match of templateMatch[1].matchAll(HOLE)) {
      const path = match[1].trim()
      const root = path.split('.')[0]
      if (scopes.has(root) || root.startsWith('$')) continue
      if (!lookup(values, path).ok) missing.add(path)
    }
    if (missing.size) problems.push(`holes with no value: ${[...missing].join(', ')}`)
  }

  if (problems.length) {
    failures += 1
    console.log(`FAIL ${file}`)
    for (const problem of problems) console.log(`     - ${problem}`)
  } else {
    console.log(`ok   ${file}`)
  }
}

console.log(failures ? `\n${failures} file(s) with problems` : `\nall ${files.length} artboards clean`)
process.exit(failures ? 1 : 0)
