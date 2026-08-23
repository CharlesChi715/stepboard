import { suite, captureSends } from './harness.mjs'

// The broad sweep: every behaviour the vanilla page had, the React panel must keep.
await suite('parity', async ({ page, ok }) => {
  const sent = await captureSends(page)

  // 1 — terminal connected and echoing
  await page.keyboard.type('echo PARITY_CHECK_OK\n')
  await page.waitForTimeout(800)
  ok('terminal connects + echoes', (await page.locator('.term').innerText()).includes('PARITY_CHECK_OK'))

  // 2 — selection → badge, key path
  const box = await page.locator('.term').boundingBox()
  const drag = async y => {
    await page.mouse.move(box.x + 10, box.y + y); await page.mouse.down()
    await page.mouse.move(box.x + 300, box.y + y, { steps: 10 }); await page.mouse.up()
    await page.waitForTimeout(200)
  }
  await drag(20)
  ok('badge reports selection', /selected: \d+ chars/.test(await page.locator('.badge').textContent().catch(() => '')))
  await page.keyboard.press('Meta+Shift+L')
  await page.waitForTimeout(200)
  const afterKey = await page.inputValue('.panel textarea')
  ok('⌘⇧L fills input', afterKey.length > 0, JSON.stringify(afterKey.slice(0, 30)))
  ok('⌘⇧L focuses input', await page.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'))

  // 3 — Enter sends, composes clauses, clears box, saves history
  sent.length = 0
  await page.fill('.panel textarea', 'hello there')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  ok('Enter sends', sent.length === 1, JSON.stringify(sent[0]?.text))
  ok('chart clause on by default', /ASCII chart or table/.test(sent[0]?.text || ''))
  ok('input cleared after send', (await page.inputValue('.panel textarea')) === '')

  // 4 — length unit default + clause
  await page.click('.panel input[value="sentences"]')
  await page.waitForTimeout(150)
  ok('unit default pops in', (await page.inputValue('.panel fieldset input[type=number]')) === '2')
  sent.length = 0
  await page.fill('.panel textarea', 'len test')
  await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  ok('length clause', /Reply in at most 2 sentences\./.test(sent[0]?.text || ''), sent[0]?.text)

  // 5 — edits box: 0 = read-only + red frame, 20 = capped + green frame
  const edits = page.locator('.panel fieldset').nth(2)
  const editsNum = edits.locator('input[type=number]')
  await editsNum.fill('0'); await page.waitForTimeout(150)
  ok('edits red at 0', (await edits.getAttribute('class')) === 'danger')
  sent.length = 0
  await page.fill('.panel textarea', 'edit test'); await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  ok('read-only clause', /Do not edit any files/.test(sent[0]?.text || ''))
  await editsNum.fill('20'); await page.waitForTimeout(150)
  ok('edits green at 20', (await edits.getAttribute('class')) === 'ok')
  sent.length = 0
  await page.fill('.panel textarea', 'edit test 2'); await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  ok('edit-cap clause', /change at most 20 lines at a time/.test(sent[0]?.text || ''))

  // 6 — prompts arm/disarm
  await page.click('.prompts button')
  ok('prompt shows snippet when armed', await page.locator('.snippet').isVisible())
  sent.length = 0
  await page.fill('.panel textarea', 'with prompt'); await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  ok('armed prompt appended', /pro and professional way/.test(sent[0]?.text || ''))
  await page.click('.prompts button')
  ok('prompt disarms', !(await page.locator('.snippet').count()))

  // 7 — history
  await page.click('.panel button:text("history")')
  await page.waitForTimeout(200)
  const histButtons = await page.locator('.hist button').count()
  ok('history lists sent items', histButtons > 0, String(histButtons))
  await page.locator('.hist button').first().click()
  ok('history click fills input', (await page.inputValue('.panel textarea')).length > 0)

  // 8 — global keys
  await page.fill('.panel textarea', 'focus test')
  await page.locator('.term').click()
  await page.keyboard.press('Meta+k')
  ok('⌘K focuses input', await page.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'))

  // 9 — regression guard: Enter typed in the terminal must NOT send the panel text
  await page.fill('.panel textarea', 'do not send me')
  sent.length = 0
  await page.locator('.term').click()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  ok('Enter in terminal does not send panel text', sent.length === 0, JSON.stringify(sent))

  // 10 — summarize leaves the draft alone
  sent.length = 0
  await page.click('.summarize'); await page.waitForTimeout(300)
  ok('summarize sends canned text', /Summarize this session\./.test(sent[0]?.text || ''))
  ok('summarize keeps draft', (await page.inputValue('.panel textarea')) === 'do not send me')
})
