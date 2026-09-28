import { suite, until, load, badge } from './harness.mjs'

// The failure paths, driven deterministically: the terminal socket is routed
// through Playwright, so a drop or a claude exit is one close() away.
await suite('resilience', async ({ page, ok }) => {
  let n = 0
  await page.routeWebSocket(/\/api\/ws$/, ws => {
    ws.connectToServer()
    n += 1
    if (n === 1) setTimeout(() => ws.close({ code: 4000 }), 300)
    if (n === 2) setTimeout(() => ws.close({ code: 1000 }), 300)
  })
  await load(page, 'reload')

  ok('a dropped terminal reconnects by itself', await until(() => n >= 2, 5000), `sockets: ${n}`)
  ok('claude exiting shows the restart pill',
     await until(async () => (await page.locator('.link-pill[data-link=ended]').count()) === 1, 5000))
  ok('an exit does not loop', !(await until(() => n > 2, 1000)), `sockets: ${n}`)
  await page.click('.link-pill')
  ok('the pill restarts it', await until(() => n === 3, 3000) &&
     await until(async () => (await page.locator('.link-pill').count()) === 0, 3000))

  await page.route('**/api/send', r => r.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ detail: "can't find pane: sb9" }) }))
  await page.fill('.panel textarea', 'this will fail')
  await page.keyboard.press('Enter')
  ok('a failed send says so', await until(async () => /not sent — can't find pane/.test(await badge(page))),
     await badge(page))
  ok('…and keeps the draft', (await page.inputValue('.panel textarea')) === 'this will fail')
  ok('…and does not record it as sent', !(await page.evaluate(() =>
    (localStorage.getItem('sb-hist') || '').includes('"this will fail","kind":"sent"'))))
  await page.unroute('**/api/send')
})
