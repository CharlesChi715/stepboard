import { chromium } from 'playwright'

const EXE = process.env.CHROME_PATH || '/Users/charles/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const URL = (process.env.SB_BASE || 'http://127.0.0.1:8011') + '/'
const out = []
const ok = (name, cond, extra = '') => out.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`)

const b = await chromium.launch({ executablePath: EXE })
const p = await b.newPage({ viewport: { width: 1200, height: 700 } })
const errs = []
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()) })

// capture what would reach tmux
let sent = []
await p.route('**/send', async route => {
  sent.push(JSON.parse(route.request().postData()))
  await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
})

await p.goto(URL, { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)

// 1 — terminal connected and echoing
await p.keyboard.type('echo PARITY_CHECK_OK\n')
await p.waitForTimeout(800)
const screen = await p.locator('.term').innerText()
ok('terminal connects + echoes', screen.includes('PARITY_CHECK_OK'))

// 2 — selection → badge, button path, key path
const box = await p.locator('.term').boundingBox()
const drag = async y => {
  await p.mouse.move(box.x + 10, box.y + y); await p.mouse.down()
  await p.mouse.move(box.x + 300, box.y + y, { steps: 10 }); await p.mouse.up()
  await p.waitForTimeout(200)
}
await drag(20)
ok('badge reports selection', /selected: \d+ chars/.test(await p.locator('.badge').textContent().catch(() => '')))
await p.click('.panel button[title="same as ⌘⇧L"]')
await p.waitForTimeout(200)
const afterBtn = await p.inputValue('.panel textarea')
ok('button fills input', afterBtn.length > 0, JSON.stringify(afterBtn.slice(0, 30)))

await p.fill('.panel textarea', '')
await drag(20)
await p.keyboard.press('Meta+Shift+L')
await p.waitForTimeout(200)
const afterKey = await p.inputValue('.panel textarea')
ok('⌘⇧L fills input', afterKey.length > 0, JSON.stringify(afterKey.slice(0, 30)))
ok('⌘⇧L focuses input', await p.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'))

// 3 — Enter sends, composes clauses, clears box, saves history
sent = []
await p.fill('.panel textarea', 'hello there')
await p.keyboard.press('Enter')
await p.waitForTimeout(300)
ok('Enter sends', sent.length === 1, JSON.stringify(sent[0]?.text))
ok('chart clause on by default', /ASCII chart or table/.test(sent[0]?.text || ''))
ok('input cleared after send', (await p.inputValue('.panel textarea')) === '')

// 4 — length unit default + clause
await p.click('.panel input[value="sentences"]')
await p.waitForTimeout(150)
ok('unit default pops in', (await p.inputValue('.panel fieldset input[type=number]')) === '2')
sent = []
await p.fill('.panel textarea', 'len test')
await p.keyboard.press('Enter'); await p.waitForTimeout(300)
ok('length clause', /Reply in at most 2 sentences\./.test(sent[0]?.text || ''), sent[0]?.text)

// 5 — edits box: 0 = read-only + red frame, 20 = capped + green frame
const editsNum = p.locator('.panel fieldset').nth(2).locator('input[type=number]')
await editsNum.fill('0'); await p.waitForTimeout(150)
ok('edits red at 0', (await p.locator('.panel fieldset').nth(2).getAttribute('class')) === 'danger')
sent = []
await p.fill('.panel textarea', 'edit test'); await p.keyboard.press('Enter'); await p.waitForTimeout(300)
ok('read-only clause', /Do not edit any files/.test(sent[0]?.text || ''))
await editsNum.fill('20'); await p.waitForTimeout(150)
ok('edits green at 20', (await p.locator('.panel fieldset').nth(2).getAttribute('class')) === 'ok')
sent = []
await p.fill('.panel textarea', 'edit test 2'); await p.keyboard.press('Enter'); await p.waitForTimeout(300)
ok('edit-cap clause', /change at most 20 lines at a time/.test(sent[0]?.text || ''))

// 6 — prompts arm/disarm
await p.click('.prompts button')
ok('prompt shows snippet when armed', await p.locator('.snippet').isVisible())
sent = []
await p.fill('.panel textarea', 'with prompt'); await p.keyboard.press('Enter'); await p.waitForTimeout(300)
ok('armed prompt appended', /pro and professional way/.test(sent[0]?.text || ''))
await p.click('.prompts button')
ok('prompt disarms', !(await p.locator('.snippet').count()))

// 7 — history
await p.click('.panel button:text("history")')
await p.waitForTimeout(200)
const histButtons = await p.locator('.hist button').count()
ok('history lists sent items', histButtons > 0, String(histButtons))
await p.locator('.hist button').first().click()
ok('history click fills input', (await p.inputValue('.panel textarea')).length > 0)

// 8 — global keys
await p.fill('.panel textarea', 'focus test')
await p.locator('.term').click()
await p.keyboard.press('Meta+k')
ok('⌘K focuses input', await p.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'))

// 9 — regression guard: Enter typed in the terminal must NOT send the panel text
await p.fill('.panel textarea', 'do not send me')
sent = []
await p.locator('.term').click()
await p.keyboard.press('Enter')
await p.waitForTimeout(400)
ok('Enter in terminal does not send panel text', sent.length === 0, JSON.stringify(sent))

// 10 — summarize leaves the draft alone
sent = []
await p.click('.summarize'); await p.waitForTimeout(300)
ok('summarize sends canned text', /Summarize this session\./.test(sent[0]?.text || ''))
ok('summarize keeps draft', (await p.inputValue('.panel textarea')) === 'do not send me')

await p.screenshot({ path: '/Users/charles/.claude/jobs/a1270aaf/tmp/react-panel.png' })
console.log(out.join('\n'))
console.log('\nERRORS:', errs.length ? errs.slice(0, 6) : 'none')
console.log('\nSUMMARY:', out.filter(l => l.startsWith('PASS')).length + '/' + out.length + ' passed')
await b.close()
