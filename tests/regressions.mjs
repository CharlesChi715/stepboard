import { suite } from './harness.mjs'

// One check per bug that actually bit — each stays here so it cannot come back.
await suite('regressions', async ({ page, ok }) => {
  // A — badge must report modified keys while focus is in the PANEL (Safari diagnostic)
  await page.click('.panel textarea')
  await page.keyboard.press('Meta+Alt+J')
  await page.waitForTimeout(200)
  const keyBadge = await page.locator('.badge').textContent().catch(() => '')
  ok('badge reports panel keys', /key: KeyJ .*meta=true/.test(keyBadge), keyBadge)

  // B — ⌘⇧K must NOT steal focus any more
  await page.click('.send')
  await page.keyboard.press('Meta+Shift+K')
  await page.waitForTimeout(150)
  ok('⌘⇧K leaves focus alone', await page.evaluate(() => document.activeElement?.tagName !== 'TEXTAREA'))

  // C — plain ⌘K still focuses
  await page.keyboard.press('Meta+k')
  await page.waitForTimeout(150)
  ok('⌘K still focuses input', await page.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'))

  // D — ⌘⇧L still reports AND fills
  const box = await page.locator('.term').boundingBox()
  await page.mouse.move(box.x + 10, box.y + 20); await page.mouse.down()
  await page.mouse.move(box.x + 300, box.y + 20, { steps: 8 }); await page.mouse.up()
  await page.fill('.panel textarea', '')
  await page.keyboard.press('Meta+Shift+L')
  await page.waitForTimeout(250)
  ok('⌘⇧L still fills input', (await page.inputValue('.panel textarea')).length > 0)

  // E — history pick survives the draft-eviction race (5 items + unsaved draft)
  await page.evaluate(() => {
    const five = ['aaa', 'bbb', 'ccc', 'ddd', 'eee'].map(t => ({ text: t, kind: 'sent' }))
    localStorage.setItem('sb-hist', JSON.stringify(five))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.click('.panel button:text("history")')
  await page.fill('.panel textarea', 'unsaved draft here')
  await page.locator('.hist button').last().click()      // oldest row — the one the cap evicts
  await page.waitForTimeout(250)
  ok('oldest history row still picks', (await page.inputValue('.panel textarea')).includes('eee'),
     JSON.stringify(await page.inputValue('.panel textarea')))
})
