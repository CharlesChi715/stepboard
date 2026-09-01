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
  ok('chart clause on by default', /ASCII diagram\/chart\/table/.test(sent[0]?.text || ''))
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
  // the mood is one marker class among the styling ones, so match a whole word
  const mood = async m => (await edits.getAttribute('class') || '').split(/\s+/).includes(m)
  await editsNum.fill('0'); await page.waitForTimeout(150)
  ok('edits red at 0', await mood('danger'))
  sent.length = 0
  await page.fill('.panel textarea', 'edit test'); await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  ok('read-only clause', /Do not edit any files/.test(sent[0]?.text || ''))
  await editsNum.fill('20'); await page.waitForTimeout(150)
  ok('edits green at 20', await mood('ok'))
  sent.length = 0
  await page.fill('.panel textarea', 'edit test 2'); await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  ok('edit-cap clause', /change at most 20 lines at a time/.test(sent[0]?.text || ''))

  // 6 — prompts arm/disarm. The snippet is a hover preview, not a status line,
  // so every snippet is always in the DOM — armed state is proven by what gets
  // sent, never by the snippet being on screen.
  const proBtn = page.locator('.prompts button').first()
  const snippet = page.locator('.snippet').first()
  await proBtn.hover(); await page.waitForTimeout(150)
  ok('snippet previews on hover', await snippet.isVisible())
  await page.locator('.term').hover(); await page.waitForTimeout(150)
  ok('snippet hides when not hovered', !(await snippet.isVisible()))
  await proBtn.click()
  sent.length = 0
  await page.fill('.panel textarea', 'with prompt'); await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  ok('armed prompt appended', /pro and professional way/.test(sent[0]?.text || ''))
  await proBtn.click()
  sent.length = 0
  await page.fill('.panel textarea', 'without prompt'); await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  ok('prompt disarms', !/pro and professional way/.test(sent[0]?.text || ''))

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
  // xterm's hidden input is a <textarea> too, so tagName alone would pass vacuously
  ok('⌘K focuses input', await page.evaluate(() =>
    !!document.activeElement?.closest('.panel') && document.activeElement.tagName === 'TEXTAREA'))

  // 8b — ⌘J walks back the other way: the left pane's one focus target
  await page.keyboard.press('Meta+j')
  ok('⌘J focuses the terminal', await page.evaluate(() =>
    !!document.activeElement?.classList.contains('xterm-helper-textarea')))

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

  // 11 — making a prompt from the panel. Last on purpose: it reloads the page
  // (to prove the new prompt survived) and leaves a prompt behind, so nothing
  // above it can be disturbed by either.
  await page.click('.new-prompt'); await page.waitForTimeout(150)
  const form = page.locator('.prompts form')
  ok('+ new opens the form', await form.isVisible())

  sent.length = 0
  await form.locator('input[type=text]').fill('tdd')
  await page.keyboard.press('Enter')                 // in the form: submits, never sends
  await page.waitForTimeout(200)
  ok('Enter in the form does not send', sent.length === 0, JSON.stringify(sent))
  ok('empty text is refused', await form.locator('.text-danger').isVisible())

  await form.locator('textarea').fill('Write the test first.')
  await form.locator('button[type=submit]').click()
  await page.waitForTimeout(200)
  const tdd = page.locator('.prompts button', { hasText: /^tdd$/ })
  ok('new prompt appears', await tdd.count() === 1)
  ok('form closes after adding', await page.locator('.prompts form').count() === 0)

  sent.length = 0
  await tdd.click()
  await page.fill('.panel textarea', 'new prompt test'); await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  ok('new prompt arms + appends', /Write the test first\./.test(sent[0]?.text || ''))

  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok('new prompt survives reload',
     await page.locator('.prompts button', { hasText: /^tdd$/ }).count() === 1)

  await page.click('.new-prompt'); await page.waitForTimeout(150)
  await page.locator('.prompts form input[type=text]').fill('tdd')
  await page.locator('.prompts form textarea').fill('a duplicate label')
  await page.locator('.prompts form button[type=submit]').click()
  await page.waitForTimeout(200)
  ok('duplicate label refused', /already exists/.test(
       await page.locator('.prompts form .text-danger').textContent().catch(() => '')))

  // 12 — editing and deleting a prompt. Runs on the `tdd` that 11 left behind
  // and ends by removing it, so the panel is back to built-ins only.
  await page.locator('.prompts form button', { hasText: /^cancel$/ }).click()
  await page.waitForTimeout(150)

  // armed FIRST, so the rename below has an armed label to carry over
  await page.locator('.prompts button', { hasText: /^tdd$/ }).click()
  await page.click('.edit-prompts'); await page.waitForTimeout(150)
  ok('edit mode explains itself', await page.locator('.prompts .hint').first().isVisible())

  // force: aria-disabled makes Playwright refuse a normal click, which is the
  // point — the check is that pressing anyway still opens nothing.
  const pro = page.locator('.prompts button', { hasText: /^pro$/ })
  await pro.click({ force: true }); await page.waitForTimeout(150)
  ok('built-ins are not editable', await pro.getAttribute('aria-disabled') === 'true'
                                && await page.locator('.prompts form').count() === 0)

  await page.locator('.prompts button', { hasText: /^tdd$/ }).click()
  await page.waitForTimeout(150)
  const efm = page.locator('.prompts form')
  ok('editing prefills the form',
     await efm.locator('input[type=text]').inputValue() === 'tdd' &&
     await efm.locator('textarea').inputValue() === 'Write the test first.')

  await efm.locator('input[type=text]').fill('pro')
  await efm.locator('button[type=submit]').click(); await page.waitForTimeout(200)
  ok('rename onto an existing label refused', /already exists/.test(
       await efm.locator('.text-danger').textContent().catch(() => '')))

  await efm.locator('input[type=text]').fill('tdd2')
  await efm.locator('textarea').fill('Red, green, refactor.')
  await efm.locator('button[type=submit]').click(); await page.waitForTimeout(200)
  ok('edit renames the prompt', await page.locator('.prompts button', { hasText: /^tdd2$/ }).count() === 1
                             && await page.locator('.prompts button', { hasText: /^tdd$/ }).count() === 0)

  await page.click('.edit-prompts'); await page.waitForTimeout(150)   // done
  sent.length = 0
  await page.fill('.panel textarea', 'after edit'); await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  ok('edited text is what gets appended', /Red, green, refactor\./.test(sent[0]?.text || ''))
  ok('rename keeps the prompt armed', !/Write the test first\./.test(sent[0]?.text || ''))

  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok('edit survives reload', await page.locator('.prompts button', { hasText: /^tdd2$/ }).count() === 1)

  await page.click('.edit-prompts'); await page.waitForTimeout(150)
  await page.locator('.prompts button', { hasText: /^tdd2$/ }).click(); await page.waitForTimeout(150)
  await page.click('.prompt-delete'); await page.waitForTimeout(150)

  // Escape unwinds one layer at a time: confirm → form → mode. The middle step
  // only works because closing the form hands focus back to the chip.
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  ok('Escape backs out of the delete confirm',
     await page.locator('.prompt-delete').textContent() === 'delete')
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  ok('Escape then closes the form', await page.locator('.prompts form').count() === 0)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  ok('Escape then leaves edit mode',
     await page.locator('.edit-prompts').textContent() === 'edit')

  await page.click('.edit-prompts'); await page.waitForTimeout(150)
  await page.locator('.prompts button', { hasText: /^tdd2$/ }).click(); await page.waitForTimeout(150)
  await page.click('.prompt-delete'); await page.waitForTimeout(150)
  ok('first delete press only arms', await page.locator('.prompt-delete').textContent() === 'sure?'
                                  && await page.locator('.prompts button', { hasText: /^tdd2$/ }).count() === 1)

  await page.click('.prompt-delete'); await page.waitForTimeout(200)
  ok('second delete press removes it',
     await page.locator('.prompts button', { hasText: /^tdd2$/ }).count() === 0)
  ok('edit mode retires with the last custom prompt',
     await page.locator('.edit-prompts').count() === 0)

  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok('delete survives reload', await page.locator('.prompts button', { hasText: /^tdd2$/ }).count() === 0)
})
