/**
 * Visual check helper: renders the running site at a few widths and writes
 * PNGs to .screenshots/. Reveal animations are forced to their final state
 * so shots are deterministic.
 *
 *   npm run start -- --port 3210
 *   node scripts/screenshot.mjs [baseUrl]
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const baseUrl = process.argv[2] ?? 'http://localhost:3210'
const outDir = '.screenshots'

const targets = [
  { name: 'wide-1920', width: 1920, height: 1080 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'laptop-1280', width: 1280, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
]

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()

for (const target of targets) {
  const page = await browser.newPage({
    viewport: { width: target.width, height: target.height },
    deviceScaleFactor: 2,
  })

  await page.goto(baseUrl, { waitUntil: 'networkidle' })

  // Settle the scroll-reveal state and kill transitions before capturing.
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

  await page.screenshot({ path: `${outDir}/${target.name}.png`, fullPage: true })
  console.log(`wrote ${outDir}/${target.name}.png`)
  await page.close()
}

await browser.close()
