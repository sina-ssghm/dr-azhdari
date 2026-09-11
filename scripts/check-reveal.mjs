/**
 * Loads the page WITHOUT forcing the reveal state and reports whether any
 * element that is visible in the first viewport is still transparent.
 *
 * The regular screenshot script forces `[data-reveal]` to its final state for
 * deterministic captures, which masks exactly this class of bug.
 *
 *   node scripts/check-reveal.mjs [url] [width] [height]
 */
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:3100'
const width = Number(process.argv[3] ?? 390)
const height = Number(process.argv[4] ?? 844)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width, height } })

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200) // let delays + transitions finish

const report = await page.evaluate((vh) => {
  return [...document.querySelectorAll('[data-reveal]')].map((el) => {
    const rect = el.getBoundingClientRect()
    return {
      inViewport: rect.top < vh && rect.bottom > 0,
      opacity: Number(getComputedStyle(el).opacity).toFixed(2),
      text: (el.textContent ?? '').trim().slice(0, 34),
    }
  })
}, height)

let failures = 0
for (const row of report) {
  const bad = row.inViewport && Number(row.opacity) < 0.99
  if (bad) failures += 1
  console.log(
    `${bad ? 'HIDDEN ' : 'ok     '} inView=${String(row.inViewport).padEnd(5)} opacity=${row.opacity}  ${row.text}`
  )
}

console.log(
  failures === 0
    ? `\nPASS — everything in the first ${width}x${height} viewport is visible without scrolling.`
    : `\nFAIL — ${failures} element(s) visible on screen but still transparent.`
)

await browser.close()
process.exit(failures === 0 ? 0 : 1)
