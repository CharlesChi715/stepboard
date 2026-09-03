import { suite, captureSends, BASE } from './harness.mjs'

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
  const proBtn = page.locator('.prompts .chips button').first()
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
  const tdd = page.locator('.prompts .chips button', { hasText: /^tdd$/ })
  ok('new prompt appears', await tdd.count() === 1)
  ok('form closes after adding', await page.locator('.prompts form').count() === 0)

  sent.length = 0
  await tdd.click()
  await page.fill('.panel textarea', 'new prompt test'); await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  ok('new prompt arms + appends', /Write the test first\./.test(sent[0]?.text || ''))

  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok('new prompt survives reload',
     await page.locator('.prompts .chips button', { hasText: /^tdd$/ }).count() === 1)

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
  await page.locator('.prompts .chips button', { hasText: /^tdd$/ }).click()
  await page.click('.edit-prompts'); await page.waitForTimeout(150)
  ok('edit mode explains itself', await page.locator('.prompts .hint').first().isVisible())

  // A shipped prompt is an ordinary prompt: it opens in the same form.
  const pro = page.locator('.prompts .chips button', { hasText: /^pro$/ })
  await pro.click(); await page.waitForTimeout(150)
  ok('a shipped prompt edits like any other',
     await page.locator('.prompts form input[type=text]').inputValue() === 'pro')
  await page.locator('.prompts form button', { hasText: /^cancel$/ }).click()
  await page.waitForTimeout(150)

  await page.locator('.prompts .chips button', { hasText: /^tdd$/ }).click()
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
  ok('edit renames the prompt', await page.locator('.prompts .chips button', { hasText: /^tdd2$/ }).count() === 1
                             && await page.locator('.prompts .chips button', { hasText: /^tdd$/ }).count() === 0)

  await page.click('.edit-prompts'); await page.waitForTimeout(150)   // done
  sent.length = 0
  await page.fill('.panel textarea', 'after edit'); await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  ok('edited text is what gets appended', /Red, green, refactor\./.test(sent[0]?.text || ''))
  ok('rename keeps the prompt armed', !/Write the test first\./.test(sent[0]?.text || ''))

  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok('edit survives reload', await page.locator('.prompts .chips button', { hasText: /^tdd2$/ }).count() === 1)

  await page.click('.edit-prompts'); await page.waitForTimeout(150)
  await page.locator('.prompts .chips button', { hasText: /^tdd2$/ }).click(); await page.waitForTimeout(150)
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
  await page.locator('.prompts .chips button', { hasText: /^tdd2$/ }).click(); await page.waitForTimeout(150)
  await page.click('.prompt-delete'); await page.waitForTimeout(150)
  ok('first delete press only arms', await page.locator('.prompt-delete').textContent() === 'sure?'
                                  && await page.locator('.prompts .chips button', { hasText: /^tdd2$/ }).count() === 1)

  await page.click('.prompt-delete'); await page.waitForTimeout(200)
  ok('second delete press removes it',
     await page.locator('.prompts .chips button', { hasText: /^tdd2$/ }).count() === 0)

  // 13 — a shipped prompt deletes too, and `restore` is the way back. The
  // button only exists while something is actually missing.
  ok('no restore button while nothing is missing',
     await page.locator('.restore-prompts').count() === 0)
  await page.locator('.prompts .chips button', { hasText: /^socratic$/ }).click(); await page.waitForTimeout(150)
  await page.click('.prompt-delete'); await page.click('.prompt-delete'); await page.waitForTimeout(200)
  ok('a shipped prompt deletes',
     await page.locator('.prompts .chips button', { hasText: /^socratic$/ }).count() === 0)
  ok('restore appears and counts what is gone',
     /restore\s*1/.test(await page.locator('.restore-prompts').textContent()))

  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok('a deleted shipped prompt stays deleted',
     await page.locator('.prompts .chips button', { hasText: /^socratic$/ }).count() === 0)

  await page.click('.edit-prompts'); await page.waitForTimeout(150)
  await page.click('.restore-prompts'); await page.waitForTimeout(200)
  ok('restore puts it back', await page.locator('.prompts .chips button', { hasText: /^socratic$/ }).count() === 1)
  ok('restore retires once nothing is missing',
     await page.locator('.restore-prompts').count() === 0)

  // 14 — delete every prompt. The mode must stay reachable, or `restore` (which
  // lives inside it) would be the one control you can never get back to.
  for (const l of ['pro', 'socratic', 'first principles']) {
    await page.locator('.prompts .chips button', { hasText: new RegExp(`^${l}$`) }).click()
    await page.waitForTimeout(120)
    await page.click('.prompt-delete'); await page.click('.prompt-delete')
    await page.waitForTimeout(180)
  }
  ok('every prompt can be deleted',
     await page.locator('.prompts .group').count() === 0)
  ok('edit mode survives an empty row', await page.locator('.edit-prompts').count() === 1)
  ok('the empty row says how to recover',
     /restore/.test(await page.locator('.prompts .hint').first().textContent()))
  await page.click('.restore-prompts'); await page.waitForTimeout(250)
  ok('restore brings them all back', await page.locator('.prompts .group').count() === 3)

  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok('delete survives reload', await page.locator('.prompts .chips button', { hasText: /^tdd2$/ }).count() === 0)

  // 15 — the store is a file on the server, not this browser. A write made
  // outside this tab (which is what a second session IS) shows up on reload,
  // and nothing of consequence is left in localStorage.
  const doc = async () => (await (await page.request.get(BASE + '/prompts')).json())
  const put = async (list, seeded, rev) => (await page.request.put(BASE + '/prompts',
    { data: { rev: rev ?? (await doc()).rev, doc: { list, seeded } } }))

  // Merely opening the panel must not write. It used to: the seed-merge handed
  // back a freshly built object, so an identity check read "changed" on every
  // load — two open sessions bumped rev past each other and the next real edit
  // died on a 409.
  const revBefore = (await doc()).rev
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok('a plain load does not write to the store', (await doc()).rev === revBefore)

  await put([{ label: 'elsewhere', text: 'written by another session' }],
            ['pro', 'socratic', 'first principles'])
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok('a write from another session shows up here',
     await page.locator('.prompts .chips button', { hasText: /^elsewhere$/ }).count() === 1)
  ok('nothing is left in per-browser storage',
     await page.evaluate(() => localStorage.getItem('sb-prompts')) === null)

  // 16 — a stale write is refused rather than silently clobbering. Two sessions
  // sharing one file makes this the expected case, not an exotic one.
  const before = await doc()
  await put([{ label: 'first', text: 'a' }], before.doc.seeded, before.rev)
  const stale = await put([{ label: 'second', text: 'b' }], before.doc.seeded, before.rev)
  ok('a stale write is refused, not applied', stale.status() === 409)
  ok('the refusal hands back the current doc',
     (await stale.json()).doc.list[0].label === 'first')

  // 17 — the two halves of why `seeded` is stored. A BUILTIN label absent from
  // it is new and must arrive; one present in it was retired and must not.
  await put([{ label: 'mine', text: 'only mine' }], ['pro', 'socratic'])
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok('a newly shipped prompt reaches an existing store',
     await page.locator('.prompts .chips button', { hasText: /^first principles$/ }).count() === 1)
  ok('a retired shipped prompt is not resurrected',
     await page.locator('.prompts .chips button', { hasText: /^pro$/ }).count() === 0)

  // 18 — the one-time adoption: a browser still holding the old per-browser
  // store, against a server that has none, keeps its prompts instead of
  // silently reverting to the seed. v1 was a bare array of only YOUR prompts.
  await page.request.delete(BASE + '/prompts')
  await page.evaluate(() => localStorage.setItem('sb-prompts',
    JSON.stringify([{ label: 'legacy', text: 'from the old shape' }])))
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok('an old per-browser store is adopted, not lost',
     await page.locator('.prompts .chips button', { hasText: /^legacy$/ }).count() === 1
     && await page.locator('.prompts .group').count() === 4)
  ok('the adopted prompts are now on the server',
     (await doc()).doc.list.some(p => p.label === 'legacy'))
  ok('the old key is retired so a reset cannot resurrect it',
     await page.evaluate(() => localStorage.getItem('sb-prompts')) === null
     && await page.evaluate(() => localStorage.getItem('sb-prompts-migrated')) !== null)

  // 19 — a store that cannot be read must SAY so, never render as an empty row.
  // An empty row reads as "every prompt was deleted", and adding one from that
  // state would write a store with the real prompts missing from it. This is
  // the shape of the /prompts-not-proxied bug, where Vite answered the fetch
  // with index.html and the panel quietly showed nothing.
  // Answer exactly the way an un-proxied route does in dev: 200, text/html,
  // the index page. That is the real failure, and unlike an aborted request it
  // leaves no console error to drown out a genuine one.
  await page.route('**/prompts', r =>
    r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>panel</title>' }))
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok('an unreadable store says so', /could not load/.test(
       await page.locator('.prompts .loading').textContent().catch(() => '')))
  ok('an unreadable store shows no prompts to edit',
     await page.locator('.prompts .chips button').count() === 0)
  ok('an unreadable store offers no way to write over it',
     await page.locator('.new-prompt').count() === 0
     && await page.locator('.edit-prompts').count() === 0)
  await page.unroute('**/prompts')
})
