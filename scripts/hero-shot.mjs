/**
 * Captures a single section at a given width — full-page shots are too
 * scaled-down to judge an image crop or a gradient on a phone.
 *
 *   node scripts/hero-shot.mjs [width] [baseUrl] [selector]
 *   node scripts/hero-shot.mjs 390 http://localhost:3100 "#booking"
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const width = Number(process.argv[2] ?? 390)
const baseUrl = process.argv[3] ?? 'http://localhost:3100'
const selector = process.argv[4] ?? 'section'
const outDir = '.screenshots'
const slug = selector.replace(/[^a-z0-9]+/gi, '') || 'hero'

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width, height: 900 },
  deviceScaleFactor: 2,
})

await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.addStyleTag({
  content: `*,*::before,*::after{animation:none!important;transition:none!important}
            [data-reveal]{opacity:1!important;transform:none!important}`,
})
await page.evaluate(() =>
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    el.dataset.reveal = 'shown'
  })
)
await page.waitForTimeout(400)

const out = `${outDir}/${slug}-${width}.png`
await page.locator(selector).first().screenshot({ path: out })
console.log(`wrote ${out}`)

await browser.close()
