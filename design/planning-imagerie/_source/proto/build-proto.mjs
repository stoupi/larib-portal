import { readFile, writeFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outFile = resolve(here, '../../prototype-planning-imagerie.html')

const parts = (await readdir(here)).filter((name) => /^\d\d-.*\.js$/.test(name)).sort()
const bundle = []
for (const part of parts) {
  bundle.push(`/* ===== ${part} ===== */\n` + (await readFile(join(here, part), 'utf8')))
}

const script = bundle.join('\n\n')

const html = `<title>Prototype — Planning imagerie cardiaque</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap">
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #f5f7fa;
    color: #141a22;
    font-family: 'Inter Tight', system-ui, -apple-system, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  button { font-family: inherit; }
  textarea, input { font-family: inherit; }
  textarea:focus, input:focus { border-color: #ec3b68; }
  a { color: #173d6e; }
  a:hover { color: #122f54; }
  ::placeholder { color: #aeb7c2; opacity: 1; }
  [data-nav]:hover, [data-act]:hover { filter: brightness(0.985); }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: #dde2e9; border-radius: 999px; }
</style>

<div id="app"></div>

<script>
${script}
</script>
`

await writeFile(outFile, html, 'utf8')
console.log(`prototype-planning-imagerie.html — ${(html.length / 1024).toFixed(1)} KB from ${parts.length} modules`)
