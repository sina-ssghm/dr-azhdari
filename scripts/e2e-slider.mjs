/**
 * Behaviour check for the testimonials slider.
 *
 *   node scripts/e2e-slider.mjs
 *
 * The looping is the fiddly part and the part worth guarding: it works by
 * rendering three copies of the list and silently jumping back to the middle
 * one once a scroll settles. A rebase that reads a stale index will loop
 * forwards exactly once and then wedge — which is precisely the bug these
 * checks were written after.
 *
 * The first check is the other one: positioning the strip must never scroll
 * the page. `scrollIntoView({ block: 'nearest' })` does, whenever the element
 * is out of view, and it landed visitors on the testimonials the moment they
 * opened the homepage.
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const base = process.argv[2] ?? 'http://localhost:3100'

await mkdir('.screenshots', { recursive: true })
const browser = await chromium.launch()

let pass = 0
let fail = 0
const check = (label, ok, extra = '') => {
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`)
}

const TRACK = 'ul[aria-label="نظرات مراجعان"]'

for (const [label, width, height] of [
  ['mobile', 390, 844],
  ['desktop', 1440, 900],
]) {
  console.log(`\n### ${label}`)
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: true })
  await page.goto(`${base}/`, { waitUntil: 'networkidle' })

  // Before touching anything: the strip mounts, positions itself on the middle
  // copy and starts its autoplay. None of that may move the document — this is
  // the check for visitors landing on the testimonials the moment they opened
  // the homepage.
  await page.waitForTimeout(6000)
  const drifted = await page.evaluate(() => Math.round(window.scrollY))
  check('opening the page does not scroll it', drifted === 0, `scrollY ${drifted}`)

  const section = page.locator('#testimonials')
  await section.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)

  const box = await section.boundingBox()
  console.log(`  section ${Math.round(box.height)}px tall`)

  /** Cards at least partly inside the scroll container. */
  const framed = () =>
    section.locator('figure').evaluateAll((els) => {
      const track = els[0]?.closest('ul')
      const t = track.getBoundingClientRect()
      return els.filter((el) => {
        const r = el.getBoundingClientRect()
        return r.right > t.left + 4 && r.left < t.right - 4
      }).length
    })

  check(
    'the neighbours peek in at both sides',
    (await framed()) === 3,
    `${await framed()} cards framed`
  )

  await page.screenshot({ path: `.screenshots/loop-${label}-1.png`, clip: box })

  const dot = async () =>
    section.locator('button[aria-current="true"]').getAttribute('aria-label')
  check('starts on the first quote', (await dot()) === 'نظر ۱', await dot())

  // Autoplay: leave it alone and see whether it moves on by itself.
  const before = await dot()
  await page.waitForTimeout(5200)
  const after = await dot()
  check('advances on its own after ~4s', before !== after, `${before} → ${after}`)

  // Hovering must hold it still.
  await section.locator(TRACK).hover()
  const held = await dot()
  await page.waitForTimeout(5200)
  check(
    'hovering pauses the autoplay',
    (await dot()) === held,
    `${held} → ${await dot()}`
  )
  await page.mouse.move(5, 5)

  // Wrap backwards off the first quote — the part a non-looping strip cannot do.
  await page.getByRole('button', { name: 'نظر ۱', exact: true }).click()
  await page.waitForTimeout(1200)
  await page.mouse.move(5, 5)
  await page.getByRole('button', { name: 'نظر قبلی' }).click()
  await page.waitForTimeout(1400)
  check(
    'going back from the first wraps to the last',
    (await dot()) === 'نظر ۱۰',
    await dot()
  )

  // ...and forwards off the last.
  await page.getByRole('button', { name: 'نظر بعدی' }).click()
  await page.waitForTimeout(1400)
  check(
    'going on from the last wraps to the first',
    (await dot()) === 'نظر ۱',
    await dot()
  )

  // The rebase must leave room to keep going, not strand us at an edge.
  for (let i = 0; i < 12; i++) {
    await page.getByRole('button', { name: 'نظر بعدی' }).click()
    await page.waitForTimeout(650)
  }
  check('still moving after a full lap and more', (await dot()) === 'نظر ۳', await dot())

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  )
  check('no horizontal page overflow', !overflow)

  const t = await section.locator(TRACK).boundingBox()
  const midY = t.y + t.height / 2

  // Native horizontal scroll — the path a touch swipe takes.
  await page.mouse.move(t.x + t.width / 2, midY)
  let was = await dot()
  await page.mouse.wheel(-t.width * 0.7, 0)
  await page.waitForTimeout(1600)
  check('scrolling the strip moves it', (await dot()) !== was, `${was} → ${await dot()}`)

  // Mouse drag. A browser will not scroll a snap container from a drag by
  // itself, so this covers the handler that makes it happen.
  const dragBy = async (dx) => {
    await page.mouse.move(t.x + t.width / 2, midY)
    await page.mouse.down()
    await page.mouse.move(t.x + t.width / 2 + dx, midY, { steps: 20 })
    await page.mouse.up()
    await page.waitForTimeout(1500)
  }

  /**
   * The highlighted card must be the one actually in the middle.
   *
   * Measured from the DOM rather than trusted: the bug this guards against
   * showed a faded card dead centre while a card off to the side carried the
   * active styling and the dots pointed at a third one.
   */
  const highlightMatchesCentre = () =>
    section.locator(TRACK).evaluate((track) => {
      const mid = track.getBoundingClientRect().left + track.clientWidth / 2
      let nearest = -1
      let shortest = Infinity
      const cards = [...track.children]
      cards.forEach((li, i) => {
        const r = li.getBoundingClientRect()
        const d = Math.abs(r.left + r.width / 2 - mid)
        if (d < shortest) {
          shortest = d
          nearest = i
        }
      })
      const figure = cards[nearest]?.querySelector('figure')
      // The centred card is the opaque, unscaled one.
      return Boolean(figure && !figure.className.includes('opacity-45'))
    })

  const distance = async (a, b) => {
    const digits = (s) =>
      Number(s.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/\D/g, ''))
    const gap = Math.abs(digits(a) - digits(b))
    return Math.min(gap, 10 - gap)
  }

  was = await dot()
  await dragBy(t.width * 0.35)
  const forward = await dot()
  check(
    'dragging right moves to the next card',
    (await distance(was, forward)) === 1,
    `${was} → ${forward}`
  )

  await dragBy(-t.width * 0.35)
  check('dragging left moves back', (await dot()) === was, `${forward} → ${await dot()}`)

  // A nudge under the threshold must settle back, not commit to a move.
  was = await dot()
  await dragBy(t.width * 0.04)
  check('a small nudge settles back', (await dot()) === was, `${was} → ${await dot()}`)

  // A long, fast pull must still advance by exactly one — the reported bug.
  was = await dot()
  await dragBy(t.width * 2.5)
  let now = await dot()
  check(
    'a long drag still advances only one card',
    (await distance(was, now)) === 1,
    `${was} → ${now}`
  )

  // ...and so must a hard trackpad flick. Modelled as a burst of ordinary
  // deltas, which is what a two-finger swipe actually emits; one giant delta
  // is a synthetic input no device produces and snap-stop does not govern it.
  was = await dot()
  await page.mouse.move(t.x + t.width / 2, midY)
  for (let i = 0; i < 14; i++) await page.mouse.wheel(-120, 0)
  await page.waitForTimeout(1800)
  now = await dot()
  check(
    'a hard flick does not skip cards',
    (await distance(was, now)) <= 1,
    `${was} → ${now}`
  )

  check('the highlighted card is the centred one', await highlightMatchesCentre())

  await page.mouse.move(5, 5)

  await page.screenshot({ path: `.screenshots/loop-${label}-2.png`, clip: box })
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
