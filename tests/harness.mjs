import { chromium, webkit } from 'playwright'
import { readFileSync } from 'fs'
import { NEWS_ID, NEWS_KEY } from '../ui/src/lib/news.js'

// Everything the suites share: launch a browser, open the panel, collect
// PASS/FAIL lines, print a summary, and exit non-zero if anything failed.
//
//   SB_BASE      panel URL          (default http://127.0.0.1:8011 — the throwaway one)
//   SB_BROWSER   chromium | webkit  (default chromium; webkit is Safari's engine)
//   CHROME_PATH  Chromium binary    (default: whatever `npx playwright install` put there)

export const BASE = process.env.SB_BASE || 'http://127.0.0.1:8011'
export const ENGINE = process.env.SB_BROWSER === 'webkit' ? 'webkit' : 'chromium'

export async function until(fn, ms = 4000) {
  const end = Date.now() + ms
  for (;;) {
    let v
    try { v = await fn() } catch { v = false }
    if (v || Date.now() > end) return v
    await new Promise(r => setTimeout(r, 15))
  }
}

export const frame = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => r())))

export const termText = page => page.locator('.term').innerText()

export const badge = page => page.evaluate(() => document.querySelector('.badge')?.textContent ?? '')

export async function ready(page) {
  await page.waitForFunction(() =>
    document.querySelector('.term .xterm-rows')?.textContent.trim() &&
    (document.querySelector('.prompts .new-prompt') ||
     /could not/.test(document.querySelector('.prompts .loading')?.textContent || '')))
}

export async function load(page, how = 'goto', path = '/') {
  const t0 = Date.now()
  if (how === 'goto') await page.goto(BASE + path)
  else await page.reload()
  await ready(page)
  return Date.now() - t0
}

export async function suite(name, body) {
  const lines = []
  const errs = []
  const ok = (label, pass, extra = '') =>
    lines.push(`${pass ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`)

  const launcher = ENGINE === 'webkit' ? webkit : chromium
  const browser = await launcher.launch(
    ENGINE === 'chromium' && process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
  let ms = 0
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 700 } })
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
    page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()) })
    await page.addInitScript(([k, v]) => { if (!sessionStorage.getItem('sb-news-test')) localStorage.setItem(k, v) },
                             [NEWS_KEY, NEWS_ID])

    // Prompts live in a file on the server, so a fresh browser is no longer a
    // fresh store: without this reset a suite would inherit whatever the last
    // run left behind. Which also means the reset could destroy the real
    // prompts.json — so refuse unless the stack was started with SB_PROMPTS
    // pointing somewhere throwaway.
    const cfg = await (await page.request.get(BASE + '/api/config')).json()
    if (cfg.prompts_default) {
      throw new Error(`refusing to run: the stack at ${BASE} is using your real prompts store ` +
                      `(${cfg.prompts}). Start it with SB_PROMPTS=/tmp/sb-prompts-test.json`)
    }
    const served = await (await page.request.get(BASE + '/')).text()
    const built = readFileSync(new URL('../ui/dist/index.html', import.meta.url), 'utf8')
    if (served !== built) throw new Error(`the stack at ${BASE} is not serving this folder's ui/dist`)
    await page.request.delete(BASE + '/api/prompts')

    ms = await load(page)
    await page.keyboard.press('Control+C')
    await page.keyboard.type(`printf '\\033[?1003l\\033[?1006l'; clear; echo SB_RE""ADY\n`)
    await until(async () => (await termText(page)).includes('SB_READY'))
    await body({ page, browser, ok })
  } catch (e) {
    ok('suite ran to completion', false, e.message)
  } finally {
    await browser.close()
  }

  const passed = lines.filter(l => l.startsWith('PASS')).length
  console.log(`— ${name} (${ENGINE}) — terminal ready in ${ms} ms`)
  console.log(lines.join('\n'))
  console.log('ERRORS:', errs.length ? errs.slice(0, 6) : 'none')
  console.log(`SUMMARY: ${passed}/${lines.length} passed`)
  if (passed !== lines.length) process.exitCode = 1
}

// Swallow POST /api/send and record it, so a test run never types into a real CLI.
// Returns a live array; assign `sent.length = 0` to reset between checks.
export async function captureSends(page) {
  const sent = []
  await page.route('**/api/send', async route => {
    sent.push(JSON.parse(route.request().postData()))
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  return sent
}
