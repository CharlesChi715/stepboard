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

const run = (...args) => spawnSync('zsh', [LAUNCHER, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const help = run('--help')
ok('--help exits 0 and prints to stdout', help.status === 0 && /Usage:/.test(help.stdout), String(help.status))
const version = run('--version')
ok('--version prints "claude-stepboard <semver> (<rev>)"',
   version.status === 0 && /^claude-stepboard \d+\.\d+\.\d+ \(\S+\)\n$/.test(version.stdout), version.stdout.trim())
const typo = run('stpo')
ok('a typo exits 2 and suggests the command', typo.status === 2 && /Did you mean 'claude-stepboard stop'\?/.test(typo.stderr))
const badOpt = run('list', '--bogus')
ok('an unknown option exits 2 and points at help', badOpt.status === 2 && /list --help/.test(badOpt.stderr))
const badN = run('stop', 'abc')
ok('a bad session number exits 2 before touching anything', badN.status === 2 && /not a session number/.test(badN.stderr))
for (const [label, args] of [['help stop', ['help', 'stop']], ['stop --help', ['stop', '--help']],
                             ['start -h', ['start', '-h']], ['ls --help', ['ls', '--help']]]) {
  const r = run(...args)
  ok(`${label} prints that command's usage`, r.status === 0 && /^Usage: claude-stepboard /.test(r.stdout))
}
const listJson = run('list', '--json')
let parsed = null
try { parsed = JSON.parse(listJson.stdout) } catch { parsed = null }
ok('list --json is a JSON array on stdout', listJson.status === 0 && Array.isArray(parsed))

let lint = ''
try { execFileSync('mandoc', ['-T', 'lint', '-W', 'warning', MAN], { encoding: 'utf8', stdio: 'pipe' }) }
catch (e) { lint = (e.stdout || '') + (e.stderr || '') || e.message }
ok('the man page lints clean', !lint, lint.trim())

const man = readFileSync(MAN, 'utf8')
for (const cmd of ['start', 'list', 'stop', 'man', 'help']) {
  ok(`"${cmd}" is in --help and the man page`,
     new RegExp(`claude-stepboard[^\\n]*\\b${cmd}\\b`).test(help.stdout) && new RegExp(`\\bCm ${cmd}\\b`).test(man))
}
for (const flag of ['--all', '--with-claude', '--dev', '--yes', '--no-input', '--no-open', '--json', '--version']) {
  const r = flag === '--version' ? help : (['--all', '--with-claude'].includes(flag) ? run('stop', '--help')
          : flag === '--json' ? run('list', '--help') : run('start', '--help'))
  ok(`${flag} is in --help and the man page`, r.stdout.includes(flag) && man.includes(`Fl ${flag.slice(1)}`))
}

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
