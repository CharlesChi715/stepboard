import { chromium } from 'playwright'

// Everything the three suites used to repeat: launch a browser, open the panel,
// collect PASS/FAIL lines, print a summary, and exit non-zero if anything failed.
//
//   SB_BASE      panel URL          (default http://127.0.0.1:8011 — the throwaway one)
//   CHROME_PATH  Chromium binary    (default: whatever `npx playwright install` put there)

export const BASE = process.env.SB_BASE || 'http://127.0.0.1:8011'

export async function suite(name, body) {
  const lines = []
  const errs = []
  const ok = (label, pass, extra = '') =>
    lines.push(`${pass ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`)

  const browser = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 700 } })
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
    page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()) })

    // Prompts live in a file on the server now, not in per-browser storage, so
    // a fresh browser is no longer a fresh store: without this reset a suite
    // would inherit whatever the last run left behind. Which also means the
    // reset could destroy the real prompts.json — so refuse unless the stack
    // was started with SB_PROMPTS pointing somewhere throwaway.
    const cfg = await (await page.request.get(BASE + '/config')).json()
    if (cfg.prompts_default) {
      throw new Error(`refusing to run: the stack at ${BASE} is using your real prompts store ` +
                      `(${cfg.prompts}). Start it with SB_PROMPTS=/tmp/sb-prompts-test.json`)
    }
    await page.request.delete(BASE + '/prompts')

    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)      // xterm needs a beat to connect and paint
    await body({ page, browser, ok })
  } catch (e) {
    ok('suite ran to completion', false, e.message)   // a crash is a failure, not a silent exit
  } finally {
    await browser.close()
  }

  const passed = lines.filter(l => l.startsWith('PASS')).length
  console.log(`— ${name} —`)
  console.log(lines.join('\n'))
  console.log('ERRORS:', errs.length ? errs.slice(0, 6) : 'none')
  console.log(`SUMMARY: ${passed}/${lines.length} passed`)
  if (passed !== lines.length) process.exitCode = 1
}

// Swallow POST /send and record it, so a test run never types into a real CLI.
// Returns a live array; assign `sent.length = 0` to reset between checks.
export async function captureSends(page) {
  const sent = []
  await page.route('**/send', async route => {
    sent.push(JSON.parse(route.request().postData()))
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  return sent
}
