import { readFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// The one check that needs no browser, because the bug it guards against is
// invisible to the others: the browser suites drive the BUILT panel, served by
// serve.py, where every route is on one origin and a proxy does not exist. In
// dev mode the panel is on Vite and the API is on FastAPI, and Vite proxies one
// prefix, /api. A path outside it does not 404 — Vite serves index.html with
// status 200, `res.json()` throws, and the feature silently reads as empty.
// That is how /prompts shipped dead.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'ui', 'src')

const walk = dir => readdirSync(dir).flatMap(f => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? walk(p) : (/\.jsx?$/.test(p) ? [p] : [])
})

const wanted = new Map()
for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(/fetch\(\s*['"`](\/[^'"`?]*)/g)) wanted.set(m[1], file.slice(ROOT.length + 1))
  for (const m of src.matchAll(/\/\/\$\{location\.host\}(\/[^'"`?]*)/g)) wanted.set(m[1], file.slice(ROOT.length + 1))
}

const cfg = readFileSync(join(ROOT, 'ui', 'vite.config.js'), 'utf8')
const prefix = cfg.match(/API_PREFIX\s*=\s*['"`]([^'"`]+)['"`]/)?.[1]

const lines = []
const ok = (label, pass, extra = '') =>
  lines.push(`${pass ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`)

ok('vite.config.js declares API_PREFIX', !!prefix, prefix)
ok('the prefix is proxied with WebSockets on', /\[API_PREFIX\]:\s*\{[^}]*ws:\s*true/.test(cfg))
ok('the panel calls at least one API path', wanted.size > 0, [...wanted.keys()].join(' '))
for (const [path, where] of wanted) {
  ok(`${path} is under ${prefix}`, !!prefix && path.startsWith(prefix + '/'), `used in ${where}`)
}

console.log('— proxy —')
console.log(lines.join('\n'))
const passed = lines.filter(l => l.startsWith('PASS')).length
console.log(`SUMMARY: ${passed}/${lines.length} passed`)
if (passed !== lines.length) process.exitCode = 1
