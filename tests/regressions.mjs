import { suite, until, load, badge, frame } from './harness.mjs'
import { NEWS_KEY } from '../ui/src/lib/news.js'

// One check per bug that actually bit — each stays here so it cannot come back.
await suite('regressions', async ({ page, ok }) => {
  const focusedTag = () => page.evaluate(() => document.activeElement?.tagName)

  await page.click('.panel textarea')
  await page.keyboard.press('Meta+Alt+J')
  await frame(page)
  ok('no key report without ?keys', !/key: /.test(await badge(page)), await badge(page))
  await load(page, 'goto', '/?keys')
  await page.click('.panel textarea')
  await page.keyboard.press('Meta+Alt+J')
  ok('?keys reports panel keys', await until(async () => /key: KeyJ .*meta=true/.test(await badge(page))), await badge(page))
  await load(page)

  await page.click('.panel textarea')
  await page.evaluate(() => document.activeElement.blur())
  await page.keyboard.press('Meta+Shift+K')
  ok('⌘⇧K leaves focus alone', (await focusedTag()) !== 'TEXTAREA')

  await page.keyboard.press('Meta+k')
  ok('⌘K still focuses input', await until(async () => (await focusedTag()) === 'TEXTAREA'))

  const box = await page.locator('.term').boundingBox()
  await page.mouse.move(box.x + 10, box.y + 20); await page.mouse.down()
  await page.mouse.move(box.x + 300, box.y + 20, { steps: 8 }); await page.mouse.up()
  await page.fill('.panel textarea', '')
  await page.keyboard.press('Meta+Shift+L')
  ok('⌘⇧L still fills input', await until(async () => (await page.inputValue('.panel textarea')).length > 0))

  await page.evaluate(() => {
    const five = ['aaa', 'bbb', 'ccc', 'ddd', 'eee'].map(t => ({ text: t, kind: 'sent' }))
    localStorage.setItem('sb-hist', JSON.stringify(five))
  })
  await load(page, 'reload')
  await page.click('.hist-toggle')
  await page.fill('.panel textarea', 'unsaved draft here')
  await page.locator('.hist button').last().click()
  const picked = () => page.inputValue('.panel textarea')
  ok('oldest history row still picks', await until(async () => (await picked()).includes('eee')),
     JSON.stringify(await picked()))

  await page.evaluate(() => localStorage.setItem('sb-hist', '[]'))
  await load(page, 'reload')
  for (const t of ['expl', 'explain', 'explain this']) {
    await page.fill('.panel textarea', t)
    await page.evaluate(() => document.activeElement.blur())
  }
  await page.click('.hist-toggle')
  ok('drafts that grow collapse into one history row',
     await until(async () => (await page.locator('.hist button').count()) === 1))

  const rows = await page.evaluate(() => {
    const t = document.querySelector('.term').getBoundingClientRect()
    const last = [...document.querySelectorAll('.term .xterm-rows > div')].at(-1).getBoundingClientRect()
    return { term: t.bottom, row: last.bottom }
  })
  ok('the last terminal row is not clipped', rows.row <= rows.term + 0.5, JSON.stringify(rows))

  const card = page.locator('details.shortcuts')
  ok('the shortcuts card is open by default', await card.evaluate(d => d.open))
  ok('it lists every shortcut group', /anywhere.*composer.*terminal.*prompt editor/s.test(await card.innerText()))
  ok('it includes ⌥1–9 and ⌘⇧L', /⌥1–9/.test(await card.innerText()) && /⌘⇧L/.test(await card.innerText()))
  await card.locator('summary').click()
  await until(() => page.evaluate(() => localStorage.getItem('sb-keys-open') === '0'))
  await load(page, 'reload')
  ok('folding it is remembered', !(await page.locator('details.shortcuts').evaluate(d => d.open)))
  await page.locator('details.shortcuts summary').click()
  await until(() => page.evaluate(() => localStorage.getItem('sb-keys-open') === '1'))

  const stops = []
  await page.route('**/api/stop', r => {
    stops.push(r.request().method())
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  const closeOpen = () => page.locator('dialog.close-board[open]')
  await page.locator('.term').click()
  await page.keyboard.press('Control+Shift+Q')
  ok('⌃⇧Q asks before closing, even from the terminal', await until(() => closeOpen().isVisible()))
  await page.keyboard.press('Escape')
  ok('esc cancels and closes nothing',
     await until(async () => (await closeOpen().count()) === 0) && stops.length === 0)
  await page.click('.panel textarea')
  await page.keyboard.press('Control+Shift+Q')
  await until(() => closeOpen().isVisible())
  await page.keyboard.press('Enter')
  ok('⏎ closes the board', await until(() => stops.length === 1), JSON.stringify(stops))
  ok('the dialog says it is closing', await until(async () => /closed/.test(await page.locator('.close-state').textContent())))
  await page.keyboard.press('Escape')
  await page.click('.close-link')
  await until(() => closeOpen().isVisible())
  ok('the dialog offers only Close and Cancel', (await page.locator('dialog.close-board button').count()) === 2)
  await page.keyboard.press('Alt+Enter')
  ok('⌥⏎ does nothing special any more', !(await until(() => stops.length > 1, 600)))
  await page.keyboard.press('Escape')
  await page.unroute('**/api/stop')

  await page.evaluate(k => { sessionStorage.setItem('sb-news-test', '1'); localStorage.removeItem(k) }, NEWS_KEY)
  await load(page, 'reload')
  ok("what's new opens once after an update", await until(() => page.locator('dialog.news[open]').isVisible()))
  await page.keyboard.press('Escape')
  ok('Escape closes it', await until(async () => (await page.locator('dialog.news[open]').count()) === 0))
  await load(page, 'reload')
  ok('it stays closed on the next load', (await page.locator('dialog.news[open]').count()) === 0)
  await page.click('.whats-new')
  ok("the what's new link reopens it", await until(() => page.locator('dialog.news[open]').isVisible()))
  await page.click('.news-close')
  await page.evaluate(() => sessionStorage.removeItem('sb-news-test'))
})
