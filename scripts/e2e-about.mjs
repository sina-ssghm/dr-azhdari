/**
 * «آشنایی با من» — the checks that would otherwise be re-done by hand.
 *
 * The client's one measurable instruction is the credential strip: four cards
 * per view on a desktop, two on a phone. That guarantee is arithmetic in CSS
 * (`w-1/2 lg:w-1/4` on a track with no gap and no horizontal padding), and the
 * two things that would silently break it — a `gap` utility, or padding on the
 * track — both still look almost right, so it is worth a script rather than an
 * eye. Sits beside e2e-slider.mjs, which guards the testimonials strip for the
 * same reason.
 *
 *   node scripts/e2e-about.mjs [baseUrl]
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const baseUrl = process.argv[2] ?? 'http://localhost:3100'
const outDir = '.screenshots'

const failures = []
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) failures.push(label)
}

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch()

/** Releases every <Reveal> and stops transitions, so a shot is deterministic. */
async function settle(page) {
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important}
              [data-reveal]{opacity:1!important;transform:none!important}`,
  })
  await page.evaluate(() => {
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      el.dataset.reveal = 'shown'
    })
  })
}

/**
 * How many cards fit the scrollport, measured off the layout rather than read
 * back out of the class list — a card counts only if its whole box is inside
 * the track, so a fifth peeking in at the edge fails the check.
 */
async function perView(page) {
  return page.evaluate(() => {
    const strip = document.querySelector('[aria-roledescription] ul')
    if (!strip) return -1
    const box = strip.getBoundingClientRect()
    return [...strip.children].filter((card) => {
      const rect = card.getBoundingClientRect()
      return rect.left >= box.left - 1 && rect.right <= box.right + 1
    }).length
  })
}

for (const view of [
  { name: 'about-desktop', width: 1440, height: 900, expect: 4 },
  { name: 'about-mobile', width: 390, height: 844, expect: 2 },
]) {
  const page = await browser.newPage({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: 2,
  })
  await page.goto(`${baseUrl}/about`, { waitUntil: 'networkidle' })
  await settle(page)

  const at = `@${view.width}`

  check((await page.title()).startsWith('آشنایی با من'), `${at} metadata title`)
  check((await page.locator('h1').innerText()) === 'دکتر زهره اژدری', `${at} hero <h1>`)

  for (const heading of [
    'مسیر حرفه‌ای من',
    'رویکرد من',
    'مجوزها و صلاحیت‌های حرفه‌ای',
    'مدارک شاخص',
    'سایر آموزش‌ها و گواهی‌های تخصصی',
    'همراه در مسیر زندگی بهتر',
  ]) {
    check(
      await page.getByRole('heading', { name: heading }).first().isVisible(),
      `${at} section «${heading}»`
    )
  }

  // Three featured tiles and ten in the strip — 3.jpg is featured only.
  const featuredCount = await page
    .locator('section:has(h2:text-is("مدارک شاخص")) > div > ul > li')
    .count()
  check(featuredCount === 3, `${at} featured row holds 3 (got ${featuredCount})`)

  const stripCount = await page.locator('[aria-roledescription] ul > li').count()
  check(stripCount === 10, `${at} strip holds 10 (got ${stripCount})`)

  const visible = await perView(page)
  check(visible === view.expect, `${at} ${view.expect} per view (got ${visible})`)

  // Scroll the page so every Reveal has fired before the stitched capture.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 40))
    }
    window.scrollTo(0, 0)
  })
  await settle(page)

  // The header is fixed and smears down a full-page shot; hide it for the
  // capture only, after everything above has been measured with it in place.
  await page.addStyleTag({ content: 'header{display:none}' })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${outDir}/${view.name}.png`, fullPage: true })
  console.log(`      wrote ${outDir}/${view.name}.png`)

  // The lightbox: open a strip tile, confirm the document and its controls,
  // page once, and close on Escape.
  const tile = page.locator('[aria-roledescription] ul > li button').first()
  const name = await tile.getAttribute('aria-label')
  await tile.click()
  const dialog = page.getByRole('dialog')
  check(await dialog.isVisible(), `${at} lightbox opens`)
  check(
    (await dialog.getByRole('img').getAttribute('alt'))?.length > 40,
    `${at} viewer image carries the full description`
  )
  const first = await dialog.locator('h2').innerText()
  check(
    name?.includes(first) ?? false,
    `${at} viewer shows the document that was clicked`
  )
  await dialog.getByRole('button', { name: 'مدرک بعدی' }).click()
  check(
    (await dialog.locator('h2').innerText()) !== first,
    `${at} viewer pages to the next document`
  )
  await page.keyboard.press('Escape')
  check(!(await dialog.isVisible().catch(() => false)), `${at} Escape closes`)

  await page.close()
}

// The nav entry, which one edit in site.ts is supposed to reach everywhere.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(`${baseUrl}/about`, { waitUntil: 'networkidle' })
check(
  await page.locator('header a[href="/about"]:text("آشنایی با من")').first().isVisible(),
  '@1440 header carries «آشنایی با من»'
)
check(
  await page.locator('footer a[href="/about"]').first().isVisible(),
  '@1440 footer quick links carry /about'
)
const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`)
check((await sitemap.text()).includes('/about'), '/about is published in the sitemap')
await page.close()

await browser.close()

console.log(failures.length ? `\n${failures.length} FAILED` : '\nall checks passed')
process.exit(failures.length ? 1 : 0)
