import { chromium } from 'playwright'

const EXE = process.env.CHROME_PATH || '/Users/charles/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const out = []
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`)

const b = await chromium.launch({ executablePath: EXE })
const p = await b.newPage({ viewport: { width: 1200, height: 700 } })
const errs = []
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))

await p.goto((process.env.SB_BASE || 'http://127.0.0.1:8011') + '/', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)

// give the shell some text, then turn ON all-motion mouse reporting like Claude Code does
await p.keyboard.type('echo DRAG_ME_AAAAAAAAAA_BBBBBBBBBB_CCCCCCCCCC\n')
await p.waitForTimeout(600)
await p.keyboard.type("printf '\\033[?1003h\\033[?1006h'\n")
await p.waitForTimeout(600)

const box = await p.locator('.term').boundingBox()
const drag = async y => {
  await p.mouse.move(box.x + 12, box.y + y)
  await p.mouse.down()
  await p.mouse.move(box.x + 340, box.y + y, { steps: 12 })
  await p.mouse.up()
  await p.waitForTimeout(250)
}

await drag(20)
const badge = await p.locator('.badge').textContent().catch(() => '')
ok('drag selects while mouse reporting is ON', /selected: \d+ chars/.test(badge), badge)

await p.fill('.panel textarea', '')
await drag(20)
await p.keyboard.press('Meta+Shift+L')
await p.waitForTimeout(250)
const val = await p.inputValue('.panel textarea')
ok('⌘⇧L grabs that selection', val.length > 0, JSON.stringify(val.slice(0, 40)))

const cursor = await p.evaluate(() => {
  const el = document.querySelector('.term .xterm-screen')
  return el ? getComputedStyle(el).cursor : 'no-el'
})
ok('cursor stays an I-beam', cursor === 'text', cursor)

// the terminal must still be usable: keystrokes reach the shell
await p.locator('.term').click()
await p.keyboard.type('echo STILL_TYPING_OK\n')
await p.waitForTimeout(700)
ok('typing still reaches the shell', (await p.locator('.term').innerText()).includes('STILL_TYPING_OK'))

await p.screenshot({ path: '/Users/charles/.claude/jobs/a1270aaf/tmp/drag.png' })
console.log(out.join('\n'))
console.log('ERRORS:', errs.length ? errs : 'none')
console.log('SUMMARY:', out.filter(l => l.startsWith('PASS')).length + '/' + out.length)
await b.close()
