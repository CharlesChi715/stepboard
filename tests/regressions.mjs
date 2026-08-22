import { chromium } from 'playwright'

const EXE = process.env.CHROME_PATH || '/Users/charles/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const BASE = process.env.SB_BASE || 'http://127.0.0.1:8011'
const out = []
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`)

const b = await chromium.launch({ executablePath: EXE })
const p = await b.newPage({ viewport: { width: 1200, height: 700 } })
const errs = []
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()) })

await p.goto(BASE + '/', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)

// A — badge must report modified keys while focus is in the PANEL (Safari diagnostic)
await p.click('.panel textarea')
await p.keyboard.press('Meta+Alt+J')
await p.waitForTimeout(200)
const keyBadge = await p.locator('.badge').textContent().catch(() => '')
ok('badge reports panel keys', /key: KeyJ .*meta=true/.test(keyBadge), keyBadge)

// B — ⌘⇧K must NOT steal focus any more
await p.click('.send')
await p.keyboard.press('Meta+Shift+K')
await p.waitForTimeout(150)
ok('⌘⇧K leaves focus alone', await p.evaluate(() => document.activeElement?.tagName !== 'TEXTAREA'))

// C — plain ⌘K still focuses
await p.keyboard.press('Meta+k')
await p.waitForTimeout(150)
ok('⌘K still focuses input', await p.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'))

// D — ⌘⇧L still reports AND fills
const box = await p.locator('.term').boundingBox()
await p.mouse.move(box.x + 10, box.y + 20); await p.mouse.down()
await p.mouse.move(box.x + 300, box.y + 20, { steps: 8 }); await p.mouse.up()
await p.fill('.panel textarea', '')
await p.keyboard.press('Meta+Shift+L')
await p.waitForTimeout(250)
ok('⌘⇧L still fills input', (await p.inputValue('.panel textarea')).length > 0)

// E — history pick survives the draft-eviction race (5 items + unsaved draft)
await p.evaluate(() => {
  const five = ['aaa', 'bbb', 'ccc', 'ddd', 'eee'].map(t => ({ text: t, kind: 'sent' }))
  localStorage.setItem('sb-hist', JSON.stringify(five))
})
await p.reload({ waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
await p.click('.panel button:text("history")')
await p.fill('.panel textarea', 'unsaved draft here')
await p.locator('.hist button').last().click()      // oldest row — the one the cap evicts
await p.waitForTimeout(250)
ok('oldest history row still picks', (await p.inputValue('.panel textarea')).includes('eee'),
   JSON.stringify(await p.inputValue('.panel textarea')))

// F — the /legacy page actually runs (assets resolve, xterm boots)
const legacy = await b.newPage()
const legacyErrs = []
legacy.on('response', r => { if (r.status() >= 400) legacyErrs.push(r.status() + ' ' + r.url()) })
await legacy.goto(BASE + '/legacy/', { waitUntil: 'networkidle' })
await legacy.waitForTimeout(1200)
ok('/legacy loads all assets', legacyErrs.length === 0, legacyErrs.join(', '))
ok('/legacy terminal boots', await legacy.locator('#term .xterm').count() > 0)

console.log(out.join('\n'))
console.log('\nERRORS:', errs.length ? errs.slice(0, 6) : 'none')
console.log('SUMMARY:', out.filter(l => l.startsWith('PASS')).length + '/' + out.length + ' passed')
await b.close()
