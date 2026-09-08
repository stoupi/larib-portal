/* Renders every view under every role in a stub DOM, so a crash or an
   `undefined` leaking into the markup is caught before publishing. */
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const parts = (await readdir(here)).filter((name) => /^\d\d-.*\.js$/.test(name)).sort()
const sources = []
for (const part of parts) sources.push(await readFile(join(here, part), 'utf8'))

let painted = ''
const listeners = []
const appNode = { set innerHTML(value) { painted = value }, get innerHTML() { return painted } }

const sandbox = {
  console,
  setTimeout: () => 0,
  clearTimeout: () => {},
  Math,
  Date,
  JSON,
  isNaN,
  localStorage: { getItem: () => null, setItem: () => {} },
  claude: { use: async () => null },
  window: { scrollTo: () => {} },
  document: {
    getElementById: (id) => (id === 'app' ? appNode : null),
    addEventListener: (type, handler) => listeners.push(handler)
  }
}
sandbox.globalThis = sandbox

const context = vm.createContext(sandbox)
vm.runInContext(sources.join('\n;\n'), context, { filename: 'bundle.js' })

const problems = []
const roles = ['COORDINATOR', 'SENIOR', 'FELLOW']

for (const role of roles) {
  vm.runInContext(`S.role = ${JSON.stringify(role)}`, context)
  const views = vm.runInContext('allowedViews()', context)
  for (const view of views) {
    vm.runInContext(`S.view = ${JSON.stringify(view)}`, context)
    try {
      vm.runInContext('render()', context)
    } catch (error) {
      problems.push(`${role}/${view}: threw — ${error.message}`)
      continue
    }
    const html = painted
    if (!html || html.length < 500) problems.push(`${role}/${view}: rendered almost nothing (${html.length} chars)`)
    if (/undefined/.test(html)) problems.push(`${role}/${view}: the word "undefined" reached the markup`)
    if (/\bNaN\b/.test(html)) problems.push(`${role}/${view}: NaN reached the markup`)
    if (/\[object Object\]/.test(html)) problems.push(`${role}/${view}: [object Object] reached the markup`)
    if (/>\s*null\s*</.test(html)) problems.push(`${role}/${view}: a null was printed as text`)
  }
}

/* Exercise the actions that mutate state, then re-render. */
const scripted = [
  ['set-role', 'SENIOR'],
  ['bulk', 'all|AVAILABLE'],
  ['submit', null],
  ['set-role', 'COORDINATOR'],
  ['generate', null],
  ['pick-slot', null],
  ['toggle-ack', null],
  ['publish', null],
  ['set-role', 'FELLOW'],
  ['decline', null],
  ['counters-period', 'year'],
  ['counters-period', 'rolling'],
  ['swap-tab', 'inbox'],
  ['swap-tab', 'outbox'],
  ['settings-tab', 'solver'],
  ['import-method', 'manual'],
  ['diff-version', 'v1'],
  ['set-live-week', '38'],
  ['set-month', 'sep'],
  ['campaign-month', '2026-12'],
  ['campaign-source', 'import'],
  ['campaign-auto', null],
  ['create-campaign', '2026-12'],
  ['set-role', 'SENIOR'],
  ['set-month', 'oct'],
  ['set-role', 'COORDINATOR'],
  ['set-space', 'app'],
  ['set-space', 'admin'],
  ['set-scope', 'month'],
  ['month-filter', 'all'],
  ['month-filter', 'mine'],
  ['swap-from', null],
  ['set-scope', 'week']
]

for (const [name, arg] of scripted) {
  try {
    vm.runInContext(`ACTIONS[${JSON.stringify(name)}](${JSON.stringify(arg)}); render()`, context)
  } catch (error) {
    problems.push(`action ${name}: threw — ${error.message}`)
  }
}

/* After publishing and a full round of edits, every view must still render. */
for (const role of roles) {
  vm.runInContext(`S.role = ${JSON.stringify(role)}`, context)
  for (const view of vm.runInContext('allowedViews()', context)) {
    vm.runInContext(`S.view = ${JSON.stringify(view)}`, context)
    try {
      vm.runInContext('render()', context)
    } catch (error) {
      problems.push(`post-mutation ${role}/${view}: threw — ${error.message}`)
    }
    if (/undefined|\bNaN\b|\[object Object\]/.test(painted)) {
      problems.push(`post-mutation ${role}/${view}: undefined/NaN/[object Object] in markup`)
    }
  }
}

const slotCount = vm.runInContext('SLOTS.length', context)
const weeks = vm.runInContext('JSON.stringify(WEEKS)', context)
const orphans = vm.runInContext('ORPHANS.length', context)
console.log(`slots: ${slotCount} · weeks: ${weeks} · orphan slots: ${orphans}`)

if (problems.length) {
  console.log('\nPROBLEMS')
  for (const problem of problems) console.log('  - ' + problem)
  process.exit(1)
}
console.log(`\nclean — ${roles.length} roles x every view, before and after ${scripted.length} state changes`)
