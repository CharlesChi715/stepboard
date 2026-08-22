import { suite } from './harness.mjs'

// Drag must select text even while the CLI app has all-motion mouse reporting on.
// See the long comment in ui/src/hooks/useTtyd.js for why that is not free.
await suite('drag-select', async ({ page, ok }) => {
  // give the shell some text, then turn ON all-motion mouse reporting like Claude Code does
  await page.keyboard.type('echo DRAG_ME_AAAAAAAAAA_BBBBBBBBBB_CCCCCCCCCC\n')
  await page.waitForTimeout(600)
  await page.keyboard.type("printf '\\033[?1003h\\033[?1006h'\n")
  await page.waitForTimeout(600)

  const box = await page.locator('.term').boundingBox()
  const drag = async y => {
    await page.mouse.move(box.x + 12, box.y + y)
    await page.mouse.down()
    await page.mouse.move(box.x + 340, box.y + y, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(250)
  }

  await drag(20)
  const badge = await page.locator('.badge').textContent().catch(() => '')
  ok('drag selects while mouse reporting is ON', /selected: \d+ chars/.test(badge), badge)

  await page.fill('.panel textarea', '')
  await drag(20)
  await page.keyboard.press('Meta+Shift+L')
  await page.waitForTimeout(250)
  const val = await page.inputValue('.panel textarea')
  ok('⌘⇧L grabs that selection', val.length > 0, JSON.stringify(val.slice(0, 40)))

  const cursor = await page.evaluate(() => {
    const el = document.querySelector('.term .xterm-screen')
    return el ? getComputedStyle(el).cursor : 'no-el'
  })
  ok('cursor stays an I-beam', cursor === 'text', cursor)

  // the terminal must still be usable: keystrokes reach the shell
  await page.locator('.term').click()
  await page.keyboard.type('echo STILL_TYPING_OK\n')
  await page.waitForTimeout(700)
  ok('typing still reaches the shell', (await page.locator('.term').innerText()).includes('STILL_TYPING_OK'))
})
