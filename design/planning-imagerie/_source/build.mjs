import { readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { page } from './shell.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const screensDir = join(here, 'screens')
const outDir = resolve(here, '..')

const entries = (await readdir(screensDir)).filter((name) => name.endsWith('.mjs')).sort()

for (const entry of entries) {
  const screen = (await import(join(screensDir, entry))).default
  const html = page(screen)
  await writeFile(join(outDir, screen.file), html, 'utf8')
  console.log(`${screen.file}  ${screen.width}x${screen.height}  ${(html.length / 1024).toFixed(1)} KB`)
}
