import { suite, captureSends } from './harness.mjs'

// The branch view reads the session transcript, so the server under test must be
// started with SB_TRANSCRIPT=tests/fixtures/session-branch.jsonl — that fixture
// carries one real branch plus the two shapes that must NOT count as one
// (a parallel tool_use/tool_result pair, and a subagent sidechain).
await suite('branches', async ({ page, ok }) => {
  const sent = await captureSends(page)

  const box = page.locator('.branches')
  ok('view is closed until asked', await box.count() === 0)

  await page.locator('.branch-btn').click()
  await page.waitForTimeout(400)
  const text = await box.textContent()

  ok('root prompt is shown', text.includes('start the panel'), JSON.stringify(text?.slice(0, 40)))
  ok('both sides of the fork are shown',
     text.includes('fix it and cmd') && text.includes('fix it and cmt'))
  ok('the tool_use/tool_result pair is not a branch',
     (text.match(/fork @/g) || []).length === 1,
     `${(text.match(/fork @/g) || []).length} forks`)
  ok('a subagent sidechain is not a prompt', !text.includes('subagent instructions'))
  ok('prompt count excludes tool traffic', text.includes('4 prompts'), text.slice(0, 30))

  // the abandoned prompt is struck through; the surviving one is not
  const dead = page.locator('.branches button', { hasText: 'fix it and cmd' })
  ok('abandoned branch is marked', ((await dead.getAttribute('class')) || '').includes('line-through'))

  // clicking a node puts that prompt back in the input box
  await dead.click()
  await page.waitForTimeout(150)
  ok('clicking a node refills the input', (await page.inputValue('.panel textarea')) === 'fix it and cmd')

  await page.locator('.branch-btn').click()
  await page.waitForTimeout(150)
  ok('button toggles the view shut', await box.count() === 0)

  // /branch is the panel's own command: it opens the view and sends nothing
  sent.length = 0
  await page.fill('.panel textarea', '/branch')
  await page.locator('.panel textarea').press('Enter')
  await page.waitForTimeout(400)
  ok('/branch opens the view', await box.count() === 1)
  ok('/branch is not sent to the CLI', sent.length === 0, JSON.stringify(sent))
  ok('/branch clears the input', (await page.inputValue('.panel textarea')) === '')
})
