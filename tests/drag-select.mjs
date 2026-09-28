import { suite, until, frame, termText } from './harness.mjs'

await suite('drag-select', async ({ page, ok }) => {
  const shows = async s => until(async () => (await termText(page)).includes(s))
  await page.keyboard.type('echo DRAG_ME_AAAAAAAAAA_BBBBBBBBBB_CCCCCCCCCC\n')
  await shows('\nDRAG_ME_')
  await page.keyboard.type(`printf '\\033[?1003h\\033[?1006h'; echo MOUSE_""ON\n`)
  await shows('MOUSE_ON')

  const box = await page.locator('.term').boundingBox()
  const badge = () => page.evaluate(() => document.querySelector('.badge')?.textContent ?? '')
  const drag = async y => {
    await page.mouse.move(box.x + 12, box.y + y)
    await page.mouse.down()
    await page.mouse.move(box.x + 340, box.y + y, { steps: 12 })
    await page.mouse.up()
  }

  await drag(20)
  ok('drag selects while mouse reporting is ON', await until(async () => /selected: \d+ chars/.test(await badge())), await badge())

  await page.mouse.move(box.x + 200, box.y + 60, { steps: 8 })
  await frame(page)
  await page.fill('.panel textarea', '')
  await page.keyboard.press('Meta+Shift+L')
  const input = () => page.inputValue('.panel textarea')
  const kept = await until(input)
  ok('selection survives idle mousemove (⌘⇧L still grabs it)', kept.length > 0, JSON.stringify(kept.slice(0, 40)))

  await page.fill('.panel textarea', '')
  await drag(20)
  await page.keyboard.press('Meta+Shift+L')
  const val = await until(input)
  ok('⌘⇧L grabs that selection', val.length > 0, JSON.stringify(val.slice(0, 40)))

  await frame(page)
  const leftover = await page.evaluate(() =>
    document.querySelectorAll('.term .xterm-selection div').length)
  ok('highlight clears after ⌘⇧L', leftover === 0, `${leftover} divs`)

  const cursor = await page.evaluate(() => {
    const el = document.querySelector('.term .xterm-screen')
    return el ? getComputedStyle(el).cursor : 'no-el'
  })
  ok('cursor stays an I-beam', cursor === 'text', cursor)

  await page.locator('.term').click()
  await page.keyboard.press('Control+C')
  await page.keyboard.type('echo STILL_TYPING_OK\n')
  ok('typing still reaches the shell', await shows('\nSTILL_TYPING_OK'))

  await page.keyboard.press('Control+C')
  await page.keyboard.type(`printf '\\033[?1003h\\033[?1006h'; echo CAT_""ON; cat -v\n`)
  await shows('\nCAT_ON')
  await frame(page)
  await page.mouse.move(box.x + 120, box.y + 80, { steps: 4 })
  const hover = await until(async () => (await termText(page)).match(/\[<35;\d+;\d+M/))
  ok('idle mouse movement reaches the app (hover)', !!hover, (hover || ['no motion report'])[0])
  await page.mouse.click(box.x + 40, box.y + 40)
  const press = await until(async () => (await termText(page)).match(/\[<0;\d+;\d+M/))
  ok('plain click reaches the app', !!press, (press || ['no press report'])[0])
  await page.keyboard.press('Control+C')
  await page.keyboard.type(`printf '\\033[?1003l\\033[?1006l'\n`)
})
