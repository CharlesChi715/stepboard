import { execFileSync, spawnSync } from 'child_process'
import { readFileSync } from 'fs'
import { SHORTCUTS } from '../ui/src/lib/keys.js'

// The docs drift the moment a command or a shortcut is added without them, so
// this checks --help and the man page against the launcher and the SHORTCUTS
// card's own source. No stack needed.
const ROOT = new URL('..', import.meta.url).pathname
const LAUNCHER = ROOT + 'bin/claude-stepboard'
const MAN = ROOT + 'man/claude-stepboard.1'
const lines = []
const ok = (label, pass, extra = '') =>
  lines.push(`${pass ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`)

const help = spawnSync('zsh', [LAUNCHER, '--help'], { encoding: 'utf8' })
ok('--help exits 0', help.status === 0, String(help.status))
const bogus = spawnSync('zsh', [LAUNCHER, 'no-such-command'], { encoding: 'utf8' })
ok('an unknown command exits 2 and shows usage', bogus.status === 2 && /usage:/.test(bogus.stderr))

let lint = ''
try { execFileSync('mandoc', ['-T', 'lint', '-W', 'warning', MAN], { encoding: 'utf8', stdio: 'pipe' }) }
catch (e) { lint = (e.stdout || '') + (e.stderr || '') || e.message }
ok('the man page lints clean', !lint, lint.trim())

const man = readFileSync(MAN, 'utf8')
for (const cmd of ['use', 'dev', 'ls', 'stop', 'man']) {
  ok(`"${cmd}" is in --help and the man page`,
     new RegExp(`claude-stepboard[^\\n]*\\b${cmd}\\b`).test(help.stdout) && new RegExp(`\\bCm ${cmd}\\b`).test(man))
}
ok('--keep is documented in both', /--keep/.test(help.stdout) && /Fl -keep/.test(man))

const spoken = k => k
  .replace(/⌃/g, 'Ctrl-').replace(/⌥/g, 'Option-').replace(/⇧/g, 'Shift-').replace(/⌘/g, 'Cmd-')
  .replace(/⏎/g, 'Return').replace(/–/g, '..').replace(/^esc$/, 'Escape')
for (const { keys } of SHORTCUTS) {
  for (const [k] of keys) {
    const names = k === '↑ ↓' ? ['Up', 'Down'] : [spoken(k)]
    ok(`the man page documents ${k}`, names.every(n => man.includes(n)), names.join(' '))
  }
}

console.log('— docs —')
console.log(lines.join('\n'))
const passed = lines.filter(l => l.startsWith('PASS')).length
console.log(`SUMMARY: ${passed}/${lines.length} passed`)
if (passed !== lines.length) process.exitCode = 1
