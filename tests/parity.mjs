import { suite, captureSends, BASE, until, load, termText, badge } from './harness.mjs'

await suite('parity', async ({ page, ok }) => {
  const sent = await captureSends(page)
  const val = () => page.inputValue('.panel textarea')
  const one = async () => { await until(async () => sent.length >= 1 && (await val()) === ''); return sent[0]?.text || '' }
  const chip = l => page.locator('.prompts .chips button', { hasText: new RegExp(`^${l}$`) })
  const has = async (l, n = 1) => until(async () => (await chip(l).count()) === n)
  const gone = l => has(l, 0)
  const text = sel => page.evaluate(s => document.querySelector(s)?.textContent ?? '', sel)

  await page.keyboard.type('echo PARITY_CHECK_OK\n')
  ok('terminal connects + echoes', await until(async () => (await termText(page)).includes('\nPARITY_CHECK_OK')))

  const box = await page.locator('.term').boundingBox()
  const drag = async y => {
    await page.mouse.move(box.x + 10, box.y + y); await page.mouse.down()
    await page.mouse.move(box.x + 300, box.y + y, { steps: 10 }); await page.mouse.up()
  }
  await drag(20)
  ok('badge reports selection', await until(async () => /selected: \d+ chars/.test(await badge(page))))
  await page.keyboard.press('Meta+Shift+L')
  const afterKey = await until(val)
  ok('⌘⇧L fills input', afterKey.length > 0, JSON.stringify(afterKey.slice(0, 30)))
  ok('⌘⇧L focuses input', await page.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'))

  sent.length = 0
  await page.fill('.panel textarea', 'hello there')
  await page.keyboard.press('Enter')
  const t3 = await one()
  ok('Enter sends', sent.length === 1, JSON.stringify(t3))
  ok('chart clause off by default', !/ASCII diagram\/chart\/table/.test(t3))
  ok('length defaults to 200 words', /Reply in at most 200 words\./.test(t3), t3)
  ok('input cleared after send', await until(async () => (await val()) === ''))

  await page.click('.panel input[value="sentences"]')
  ok('unit default pops in', await until(async () => (await page.inputValue('.panel fieldset input[type=number]')) === '2'))
  await until(() => page.evaluate(() => document.activeElement === document.querySelector('.panel fieldset input[type=number]')))
  sent.length = 0
  await page.fill('.panel textarea', 'len test')
  await page.keyboard.press('Enter')
  const t4 = await one()
  ok('length clause', /Reply in at most 2 sentences\./.test(t4), t4)

  const edits = page.locator('.panel fieldset').nth(2)
  const editsNum = edits.locator('input[type=number]')
  const mood = m => until(async () => (await edits.getAttribute('class') || '').split(/\s+/).includes(m))
  await editsNum.fill('0')
  ok('edits red at 0', await mood('danger'))
  sent.length = 0
  await page.fill('.panel textarea', 'edit test'); await page.keyboard.press('Enter')
  ok('read-only clause', /Do not edit any files/.test(await one()))
  await editsNum.fill('20')
  ok('edits green at 20', await mood('ok'))
  sent.length = 0
  await page.fill('.panel textarea', 'edit test 2'); await page.keyboard.press('Enter')
  ok('edit-cap clause', /change at most 20 lines at a time/.test(await one()))

  ok('the tail line shows what gets appended', /≤20 lines\/step/.test(await text('.tail')))
  await page.fill('.panel textarea', '/cost')
  ok('a /command reads as raw', /raw/.test(await text('.tail')))
  sent.length = 0
  await page.keyboard.press('Enter')
  ok('a /command is sent exactly as typed', (await one()) === '/cost')
  sent.length = 0
  await page.fill('.panel textarea', '!ls -la'); await page.keyboard.press('Enter')
  ok('a !shell line is sent exactly as typed', (await one()) === '!ls -la')

  const proBtn = page.locator('.prompts .chips button').first()
  const snippet = page.locator('.snippet').first()
  await proBtn.hover()
  ok('snippet previews on hover', await until(() => snippet.isVisible()))
  await page.locator('.term').hover()
  ok('snippet hides when not hovered', await until(async () => !(await snippet.isVisible())))
  await page.click('.panel textarea')
  await proBtn.click()
  ok('a chip click keeps the caret in the composer', await page.evaluate(() =>
    document.activeElement === document.querySelector('.panel textarea')))
  ok('an armed chip is aria-pressed', await until(async () => (await proBtn.getAttribute('aria-pressed')) === 'true'))
  sent.length = 0
  await page.fill('.panel textarea', 'with prompt'); await page.keyboard.press('Enter')
  ok('armed prompt appended', /pro and professional way/.test(await one()))
  await proBtn.click()
  sent.length = 0
  await page.fill('.panel textarea', 'without prompt'); await page.keyboard.press('Enter')
  ok('prompt disarms', !/pro and professional way/.test(await one()))
  ok('a disarmed chip is not pressed', (await proBtn.getAttribute('aria-pressed')) === 'false')

  await page.click('.panel textarea')
  await page.keyboard.press('Alt+Digit1')
  ok('⌥1 arms the first prompt', await until(async () => (await proBtn.getAttribute('aria-pressed')) === 'true'))
  await page.keyboard.press('Alt+Digit1')
  ok('⌥1 again disarms it', await until(async () => (await proBtn.getAttribute('aria-pressed')) === 'false'))

  await page.click('.hist-toggle')
  const histButtons = await until(() => page.locator('.hist button').count())
  ok('history lists sent items', histButtons > 0, String(histButtons))
  await page.locator('.hist button').first().click()
  ok('history click fills input', await until(async () => (await val()).length > 0))

  await page.fill('.panel textarea', 'focus test')
  await page.locator('.term').click()
  await page.keyboard.press('Meta+k')
  ok('⌘K focuses input', await until(() => page.evaluate(() =>
    !!document.activeElement?.closest('.panel') && document.activeElement.tagName === 'TEXTAREA')))

  await page.keyboard.press('Meta+j')
  ok('⌘J focuses the terminal', await until(() => page.evaluate(() =>
    !!document.activeElement?.classList.contains('xterm-helper-textarea'))))

  await page.fill('.panel textarea', 'do not send me')
  sent.length = 0
  await page.locator('.term').click()
  await page.keyboard.press('Enter')
  await page.click('.summarize')
  await until(() => sent.length >= 1)
  ok('Enter in terminal does not send panel text', sent.length === 1 && !/do not send me/.test(sent[0].text), JSON.stringify(sent))
  ok('summarize sends canned text', /Summarize this session\./.test(sent[0]?.text || ''))
  ok('summarize keeps draft', (await val()) === 'do not send me')

  await page.click('.new-prompt')
  const form = page.locator('.prompts form')
  ok('+ new opens the form', await until(() => form.isVisible()))

  sent.length = 0
  await form.locator('input[type=text]').fill('tdd')
  await page.keyboard.press('Enter')
  ok('empty text is refused', await until(() => form.locator('.text-danger').isVisible()))
  await page.click('.summarize')
  await until(() => sent.length >= 1)
  ok('Enter in the form does not send', sent.length === 1 && /Summarize/.test(sent[0].text), JSON.stringify(sent))

  await form.locator('textarea').fill('Write the test first.')
  await form.locator('button[type=submit]').click()
  const tdd = chip('tdd')
  ok('new prompt appears', await has('tdd'))
  ok('form closes after adding', await until(async () => (await page.locator('.prompts form').count()) === 0))

  sent.length = 0
  await tdd.click()
  await page.fill('.panel textarea', 'new prompt test'); await page.keyboard.press('Enter')
  ok('new prompt arms + appends', /Write the test first\./.test(await one()))

  await load(page, 'reload')
  ok('new prompt survives reload', await has('tdd'))

  await page.click('.new-prompt')
  await page.locator('.prompts form input[type=text]').fill('tdd')
  await page.locator('.prompts form textarea').fill('a duplicate label')
  await page.locator('.prompts form button[type=submit]').click()
  ok('duplicate label refused', await until(async () => /already exists/.test(await text('.prompts form .text-danger'))))

  await page.locator('.prompts form button', { hasText: /^cancel$/ }).click()

  await chip('tdd').click()
  await page.click('.edit-prompts')
  ok('edit mode explains itself', await until(() => page.locator('.prompts .hint').first().isVisible()))

  await chip('pro').click()
  ok('a shipped prompt edits like any other',
     await until(async () => (await page.locator('.prompts form input[type=text]').inputValue()) === 'pro'))
  await page.locator('.prompts form button', { hasText: /^cancel$/ }).click()

  await chip('tdd').click()
  const efm = page.locator('.prompts form')
  ok('editing prefills the form', await until(async () =>
     await efm.locator('input[type=text]').inputValue() === 'tdd' &&
     await efm.locator('textarea').inputValue() === 'Write the test first.'))

  await efm.locator('input[type=text]').fill('pro')
  await efm.locator('button[type=submit]').click()
  ok('rename onto an existing label refused', await until(async () => /already exists/.test(
       await efm.locator('.text-danger').textContent().catch(() => ''))))

  await efm.locator('input[type=text]').fill('tdd2')
  await efm.locator('textarea').fill('Red, green, refactor.')
  await efm.locator('button[type=submit]').click()
  ok('edit renames the prompt', await has('tdd2') && await gone('tdd'))

  await page.click('.edit-prompts')
  await until(async () => (await text('.edit-prompts')) === 'edit')
  sent.length = 0
  await page.fill('.panel textarea', 'after edit'); await page.keyboard.press('Enter')
  const t12 = await one()
  ok('edited text is what gets appended', /Red, green, refactor\./.test(t12))
  ok('rename keeps the prompt armed', !/Write the test first\./.test(t12))

  await load(page, 'reload')
  ok('edit survives reload', await has('tdd2'))

  await page.click('.edit-prompts')
  await chip('tdd2').click()
  await page.click('.prompt-delete')
  await until(async () => (await text('.prompt-delete')) === 'sure?')

  await page.keyboard.press('Escape')
  ok('Escape backs out of the delete confirm', await until(async () => (await text('.prompt-delete')) === 'delete'))
  await page.keyboard.press('Escape')
  ok('Escape then closes the form', await until(async () => (await page.locator('.prompts form').count()) === 0))
  await page.keyboard.press('Escape')
  ok('Escape then leaves edit mode', await until(async () => (await text('.edit-prompts')) === 'edit'))

  await page.click('.edit-prompts')
  await chip('tdd2').click()
  await page.click('.prompt-delete')
  ok('first delete press only arms', await until(async () => (await text('.prompt-delete')) === 'sure?')
                                  && await chip('tdd2').count() === 1)

  await page.click('.prompt-delete')
  ok('second delete press removes it', await gone('tdd2'))

  ok('no restore button while nothing is missing', await page.locator('.restore-prompts').count() === 0)
  await chip('socratic').click()
  await page.click('.prompt-delete'); await until(async () => (await text('.prompt-delete')) === 'sure?')
  await page.click('.prompt-delete')
  ok('a shipped prompt deletes', await gone('socratic'))
  ok('restore appears and counts what is gone',
     await until(async () => /restore\s*1/.test(await text('.restore-prompts'))))

  await load(page, 'reload')
  ok('a deleted shipped prompt stays deleted', await gone('socratic'))

  await page.click('.edit-prompts')
  await page.click('.restore-prompts')
  ok('restore puts it back', await has('socratic'))
  ok('restore retires once nothing is missing',
     await until(async () => (await page.locator('.restore-prompts').count()) === 0))

  for (const l of ['pro', 'socratic', 'first principles']) {
    await chip(l).click()
    await page.click('.prompt-delete'); await until(async () => (await text('.prompt-delete')) === 'sure?')
    await page.click('.prompt-delete')
    await gone(l)
  }
  ok('every prompt can be deleted', await until(async () => (await page.locator('.prompts .group').count()) === 0))
  ok('edit mode survives an empty row', await page.locator('.edit-prompts').count() === 1)
  ok('the empty row says how to recover',
     /restore/.test(await page.locator('.prompts .hint').first().textContent()))
  await page.click('.restore-prompts')
  ok('restore brings them all back', await until(async () => (await page.locator('.prompts .group').count()) === 3))

  const order = () => page.locator('.prompts .chips button').allTextContents()
  const [a, b] = await order()
  await chip(a).click()
  ok('◀ is marked unavailable at the start of the row',
     await until(async () => (await page.locator('.move[aria-label="move earlier"]').getAttribute('aria-disabled')) === 'true'))
  await page.click('.move[aria-label="move later"]')
  ok('▶ moves a prompt later', await until(async () => (await order())[1] === a && (await order())[0] === b))
  ok('the new order is saved', await until(async () =>
    (await (await page.request.get(BASE + '/api/prompts')).json()).doc.list[1].label === a))
  await page.click('.move[aria-label="move earlier"]')
  ok('◀ moves it back', await until(async () => (await order())[0] === a))
  await page.locator('.prompts form button', { hasText: /^cancel$/ }).click()

  await load(page, 'reload')
  ok('delete survives reload', await gone('tdd2'))

  const doc = async () => (await (await page.request.get(BASE + '/api/prompts')).json())
  const put = async (list, seeded, rev) => (await page.request.put(BASE + '/api/prompts',
    { data: { rev: rev ?? (await doc()).rev, doc: { list, seeded } } }))

  const revBefore = (await doc()).rev
  const writes = []
  const onReq = r => { if (r.method() === 'PUT' && r.url().endsWith('/api/prompts')) writes.push(r.url()) }
  page.on('request', onReq)
  await load(page, 'reload')
  page.off('request', onReq)
  ok('a plain load does not write to the store', writes.length === 0 && (await doc()).rev === revBefore)

  await put([{ label: 'elsewhere', text: 'written by another session' }],
            ['pro', 'socratic', 'first principles'])
  await load(page, 'reload')
  ok('a write from another session shows up here', await has('elsewhere'))
  ok('nothing is left in per-browser storage',
     await page.evaluate(() => localStorage.getItem('sb-prompts')) === null)

  const before = await doc()
  await put([{ label: 'first', text: 'a' }], before.doc.seeded, before.rev)
  const stale = await put([{ label: 'second', text: 'b' }], before.doc.seeded, before.rev)
  ok('a stale write is refused, not applied', stale.status() === 409)
  ok('the refusal hands back the current doc',
     (await stale.json()).doc.list[0].label === 'first')

  await put([{ label: 'mine', text: 'only mine' }], ['pro', 'socratic'])
  await load(page, 'reload')
  ok('a newly shipped prompt reaches an existing store', await has('first principles'))
  ok('a retired shipped prompt is not resurrected', await gone('pro'))

  await page.request.delete(BASE + '/api/prompts')
  await page.evaluate(() => localStorage.setItem('sb-prompts',
    JSON.stringify([{ label: 'legacy', text: 'from the old shape' }])))
  await load(page, 'reload')
  ok('an old per-browser store is adopted, not lost',
     await has('legacy') && await until(async () => (await page.locator('.prompts .group').count()) === 4))
  ok('the adopted prompts are now on the server',
     await until(async () => (await doc()).doc?.list.some(p => p.label === 'legacy')))
  ok('the old key is retired so a reset cannot resurrect it',
     await until(() => page.evaluate(() =>
       localStorage.getItem('sb-prompts') === null && localStorage.getItem('sb-prompts-migrated') !== null)))

  await page.route('**/api/prompts', r =>
    r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>panel</title>' }))
  await load(page, 'reload')
  ok('an unreadable store says so', /could not load/.test(await text('.prompts .loading')))
  ok('an unreadable store shows no prompts to edit',
     await page.locator('.prompts .chips button').count() === 0)
  ok('an unreadable store offers no way to write over it',
     await page.locator('.new-prompt').count() === 0
     && await page.locator('.edit-prompts').count() === 0)
  await page.unroute('**/api/prompts')
})
