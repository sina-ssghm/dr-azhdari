/**
 * Adverse-condition probe for the payment-receipt uploader.
 *
 *   node scripts/e2e-uploader.mjs [baseUrl]
 *
 * Drives the real uploader in a real browser through every way an upload can
 * go wrong on an Iranian mobile connection — a hung server, a dropped
 * connection, a proxy error page, an offline handset, a crawling 3G link — and
 * asserts the one property that matters: the visitor is never left in a state
 * with no way out. Seeds and sweeps its own bookings, so DATABASE_URL is
 * required.
 *
 * The «رسید شما ثبت شد» panel is deliberately NOT the success assertion:
 * router.refresh() re-renders from the server, which now sees a receipt and
 * swaps in the awaiting-review panel, often within the same frame.
 */
import { chromium } from 'playwright'
import { randomUUID } from 'node:crypto'
import pg from 'pg'

const base = process.argv[2] ?? 'http://localhost:3100'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required — the probe seeds its own bookings.')
  process.exit(1)
}
// The app reaches Postgres as the container sees it; this script runs on the host.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL.replace('host.docker.internal', 'localhost'),
})

/** Reserved for this probe, so its rows are safe to sweep. */
const PHONE = '+989120007777'

let pass = 0
let fail = 0
const ok = (label, extra = '') => {
  pass++
  console.log(`PASS  ${label}${extra ? ' — ' + extra : ''}`)
}
const bad = (label, extra = '') => {
  fail++
  console.log(`FAIL  ${label}${extra ? ' — ' + extra : ''}`)
}
/** Reports one assertion. Mirrors `check()` in scripts/e2e-admin.mjs. */
const check = (label, condition, extra = '') => (condition ? ok : bad)(label, extra)

function png(bytes) {
  const head = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  )
  return Buffer.concat([head, Buffer.alloc(Math.max(0, bytes - head.length), 0x20)])
}

// Swept at the start, not the end, so a failed run's rows stay inspectable
// while still never colliding with the next run's slots.
await pool.query('delete from appointment where phone = $1', [PHONE])

let day = 700
async function booking(label) {
  const ref = randomUUID()
  const on = new Date(Date.now() + 86400000 * day++).toISOString().slice(0, 10)
  await pool.query(
    `insert into appointment (booking_ref, service_id, scheduled_on, scheduled_at, duration_min,
       full_name, phone, status, payment_method, payment_status, amount, currency, created_by)
     values ($1,'individual',$2,'03:00',60,$3,$4,'pending','iran_card','unpaid',2500000,'IRT','public')`,
    [ref, on, label, PHONE]
  )
  return ref
}

const browser = await chromium.launch()

/** Fresh page on a fresh booking, parked on the payment page with the uploader up. */
async function open(label) {
  const ref = await booking(label)
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`${base}/booking/${ref}/pay`, { waitUntil: 'domcontentloaded' })
  // The uploader is behind «پرداخت کردم» — the visitor asserts they have paid first.
  await page.getByRole('button', { name: 'پرداخت کردم' }).click({ timeout: 15000 })
  await page.getByText('فایل رسید را اینجا رها کنید').waitFor({ timeout: 15000 })
  return { ref, context, page }
}

async function attach(
  page,
  { name = 'receipt.png', type = 'image/png', size = 200 * 1024 } = {}
) {
  await page
    .locator('input#receipt')
    .setInputFiles({ name, mimeType: type, buffer: png(size) })
}

const submit = (page) => page.getByRole('button', { name: /ارسال رسید|در حال ارسال/ })

/**
 * `p[role=alert]`, not `[role=alert]`: Next.js injects its own always-empty
 * `div#__next-route-announcer__` with role=alert on the first client-side
 * interaction, and a bare selector matches that immediately.
 */
const alertText = (page) => page.locator('p[role=alert]').first()

const messageIn = async (page, timeout = 15000) => {
  await alertText(page)
    .waitFor({ timeout })
    .catch(() => {})
  return (
    (await alertText(page)
      .textContent()
      .catch(() => '')) ?? ''
  )
}

/** The property that actually matters: can the visitor try again? */
async function recoverable(page, timeout = 20000) {
  const deadline = Date.now() + timeout
  for (;;) {
    const button = submit(page)
    if (await button.isEnabled().catch(() => false)) {
      return { enabled: true, label: ((await button.textContent()) ?? '').trim() }
    }
    if (Date.now() > deadline) {
      const label = ((await button.textContent().catch(() => '')) ?? '').trim()
      return { enabled: false, label }
    }
    await page.waitForTimeout(250)
  }
}

/**
 * Success is not the «رسید شما ثبت شد» panel: router.refresh() re-renders the
 * page from the server, which now sees a receipt and swaps the whole uploader
 * for the awaiting-review panel, often within the same frame.
 */
const accepted = (page) =>
  Promise.race([
    page.getByText('رسید شما ثبت شد').waitFor({ timeout: 40000 }),
    page.getByText('در انتظار تأیید پرداخت').first().waitFor({ timeout: 40000 }),
  ])

/* ---------------------------------------------------------------- 1. baseline */
{
  const { page, context, ref } = await open('baseline')
  await attach(page)
  await submit(page).click()
  const landed = await accepted(page)
    .then(() => true)
    .catch(() => false)
  check('a normal upload is accepted and the page moves on', landed)

  const row = (
    await pool.query('select receipt_path from appointment where booking_ref=$1', [ref])
  ).rows[0]
  check('the receipt is stored server-side', Boolean(row?.receipt_path))
  await context.close()
}

/* ------------------------------------------------- 2. server error, then retry */
{
  const { page, context } = await open('server 500')
  let firstAttempt = true
  await page.route('**/api/booking/*/receipt', async (route) => {
    if (firstAttempt) {
      firstAttempt = false
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: '{"error":"خطای آزمایشی سرور"}',
      })
    }
    return route.continue()
  })
  await attach(page)
  await submit(page).click()

  const shown = await messageIn(page)
  check(
    "the server's own error message is surfaced",
    shown.includes('خطای آزمایشی'),
    shown
  )

  const state = await recoverable(page)
  check('after a 500 the visitor can retry', state.enabled, JSON.stringify(state))

  await submit(page).click()
  const retried = await accepted(page)
    .then(() => true)
    .catch(() => false)
  check('the retry actually succeeds', retried)
  await context.close()
}

/* --------------------------------------- 3. proxy HTML error page, not our JSON */
{
  const { page, context } = await open('html error')
  await page.route('**/api/booking/*/receipt', (route) =>
    route.fulfill({
      status: 502,
      contentType: 'text/html',
      body: '<html><body>Bad gateway</body></html>',
    })
  )
  await attach(page)
  await submit(page).click()

  const shown = await messageIn(page)
  check(
    'a proxy HTML error falls back to the generic message',
    shown.includes('بارگذاری رسید ناموفق'),
    shown
  )
  check('after a 502 the visitor can retry', (await recoverable(page)).enabled)
  await context.close()
}

/* ------------------------------------------------ 4. connection dropped mid-flight */
{
  const { page, context } = await open('aborted')
  await page.route('**/api/booking/*/receipt', (route) => route.abort('connectionreset'))
  await attach(page)
  await submit(page).click()

  const shown = await messageIn(page)
  check(
    'a dropped connection reports a connection error',
    shown.includes('ارتباط با سرور'),
    shown
  )
  check(
    'after a dropped connection the visitor can retry',
    (await recoverable(page)).enabled
  )
  await context.close()
}

/* ------------------------------------------------------------- 5. offline device */
{
  const { page, context } = await open('offline')
  await attach(page)
  await context.setOffline(true)
  await submit(page).click()

  const shown = await messageIn(page, 20000)
  check(
    'an offline device gets an error rather than a spinner',
    Boolean(shown),
    shown.slice(0, 40)
  )
  await context.setOffline(false)
  check('coming back online the visitor can retry', (await recoverable(page)).enabled)
  await context.close()
}

/* ------------------------------------- 6. double click must not double-upload */
{
  const { page, context, ref } = await open('double click')
  let requests = 0
  page.on('request', (r) => {
    if (r.url().includes('/receipt') && r.method() === 'POST') requests++
  })
  await attach(page)
  const button = submit(page)
  await button.click({ force: true })
  await button.click({ force: true }).catch(() => {})
  await button.click({ force: true }).catch(() => {})
  await accepted(page).catch(() => {})
  await page.waitForTimeout(1500)
  check(
    'three rapid clicks send exactly one upload',
    requests === 1,
    `${requests} requests`
  )

  const stored = (
    await pool.query('select receipt_path from appointment where booking_ref=$1', [ref])
  ).rows[0]
  check('the single upload was stored', Boolean(stored?.receipt_path))
  await context.close()
}

/* ------------------------------------------- 7. rejected files never block the form */
{
  const { page, context } = await open('rejected files')
  await attach(page, { name: 'huge.png', size: 6 * 1024 * 1024 })
  let shown = await messageIn(page, 10000)
  check('an oversized file is refused with its size', shown.includes('۵ مگابایت'), shown)

  await page.locator('input#receipt').setInputFiles({
    name: 'photo.heic',
    mimeType: 'image/heic',
    buffer: Buffer.from('ftypheic'),
  })
  await page.waitForTimeout(400)
  shown =
    (await alertText(page)
      .textContent()
      .catch(() => '')) ?? ''
  check(
    'an iPhone HEIC photo gets its own actionable message',
    shown.includes('HEIC'),
    shown
  )

  // Android file providers routinely hand over a real JPEG with no MIME type.
  await page
    .locator('input#receipt')
    .setInputFiles({ name: 'receipt.jpg', mimeType: '', buffer: png(80 * 1024) })
  await page.waitForTimeout(500)
  const acceptedByExtension = await page
    .getByText('receipt.jpg')
    .isVisible()
    .catch(() => false)
  check('a JPEG with no MIME type is accepted on its extension', acceptedByExtension)

  await page
    .locator('input#receipt')
    .setInputFiles({ name: 'scan', mimeType: '', buffer: png(1024) })
  await page.waitForTimeout(400)
  shown =
    (await alertText(page)
      .textContent()
      .catch(() => '')) ?? ''
  check(
    'a file with neither type nor extension is still refused',
    shown.includes('فقط تصویر'),
    shown
  )

  await attach(page)
  await submit(page).click()
  const recovered = await accepted(page)
    .then(() => true)
    .catch(() => false)
  check('after three rejected files a good one still uploads', recovered)
  await context.close()
}

/* ------------------------------------------ 8. server never answers: the watchdog */
{
  const { page, context } = await open('hung server')
  // Body is accepted, response never sent — exactly the reported symptom.
  await page.route('**/api/booking/*/receipt', () => {})
  await attach(page)
  await submit(page).click()
  await page.waitForTimeout(3000)

  const midLabel =
    (await submit(page)
      .textContent()
      .catch(() => '')) ?? ''
  check(
    'while hung, the button shows sending',
    midLabel.includes('در حال ارسال'),
    midLabel
  )

  const started = Date.now()
  const freed = await alertText(page)
    .waitFor({ timeout: 90000 })
    .then(() => true)
    .catch(() => false)
  const secs = Math.round((Date.now() - started) / 1000)
  const shown = freed
    ? ((await alertText(page).textContent()) ?? '')
    : 'still stuck after 90s'
  check(
    `the stall watchdog frees the uploader after ~${secs}s`,
    freed,
    shown.slice(0, 50)
  )
  check('after a stall the visitor can retry', (await recoverable(page)).enabled)
  await context.close()
}

/* ---------------------------------- 9. genuinely slow upload must NOT be killed */
{
  const { page, context } = await open('slow upload')
  const client = await context.newCDPSession(page)
  await client.send('Network.enable')
  // ~50 KB/s up: a 400 KB receipt takes a long, but entirely healthy, while.
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 300,
    downloadThroughput: 200 * 1024,
    uploadThroughput: 50 * 1024,
  })
  await attach(page, { size: 400 * 1024 })
  await submit(page).click()

  const done = await accepted(page)
    .then(() => true)
    .catch(() => false)
  const stalled = await alertText(page)
    .isVisible()
    .catch(() => false)
  check(
    'a slow-but-progressing upload is not killed by the watchdog',
    done && !stalled,
    `done=${done} stalled=${stalled}`
  )
  await context.close()
}

/* -------------------------------------------- 10. navigating away mid-upload */
{
  const { page, context, ref } = await open('navigate away')
  await page.route('**/api/booking/*/receipt', async (route) => {
    await new Promise((r) => setTimeout(r, 4000))
    return route.continue()
  })
  await attach(page)
  await submit(page).click()
  await page.waitForTimeout(800)
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)
  await page.goto(`${base}/booking/${ref}/pay`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  // Whatever happened to the request, the page must show a coherent state.
  const body = (await page.locator('body').textContent()) ?? ''
  const coherent =
    body.includes('در انتظار تأیید پرداخت') ||
    body.includes('پرداخت کردم') ||
    body.includes('فایل رسید را اینجا رها کنید')
  check('leaving mid-upload leaves the page in a coherent state', coherent)
  await context.close()
}

/* ------------------------------------------- 11. cancelling an upload in flight */
{
  const { page, context } = await open('cancel')
  await page.route('**/api/booking/*/receipt', async (route) => {
    await new Promise((r) => setTimeout(r, 30000))
    return route.continue()
  })
  await attach(page, { size: 300 * 1024 })
  await submit(page).click()
  await page.waitForTimeout(1200)

  const cancelButton = page.getByRole('button', { name: 'لغو ارسال' })
  const offered = await cancelButton.isVisible().catch(() => false)
  check('a cancel button is offered while sending', offered)

  await cancelButton.click()
  await page.waitForTimeout(600)
  const shown =
    (await alertText(page)
      .textContent()
      .catch(() => '')) ?? ''
  check('cancelling says so', shown.includes('لغو شد'), shown)
  check('after cancelling the visitor can send again', (await recoverable(page)).enabled)

  await page.unroute('**/api/booking/*/receipt')
  await submit(page).click()
  const retried = await accepted(page)
    .then(() => true)
    .catch(() => false)
  check('a cancelled upload can be retried to success', retried)
  await context.close()
}

await browser.close()
await pool.query('delete from appointment where phone=$1', [PHONE])
await pool.end()

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
