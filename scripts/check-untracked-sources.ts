import { execFileSync } from 'node:child_process'
import { findUntrackedSources } from '../lib/git/untracked-sources'

const untrackedPaths = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
  encoding: 'utf8',
}).split('\n')

const offenders = findUntrackedSources(untrackedPaths)

if (offenders.length === 0) process.exit(0)

console.error('\nPush blocked: these source files exist locally but were never committed.')
console.error('The local build compiles them, Vercel clones from GitHub and cannot.\n')
for (const offender of offenders) console.error(`  ${offender}`)
console.error('\nRun `git add <file>` and commit them, or delete them if they are scratch work.\n')
process.exit(1)
