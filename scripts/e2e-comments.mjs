/**
 * End-to-end test of visitor comments and their moderation.
 *
 *   node scripts/e2e-comments.mjs [baseUrl] [username] [password]
 *
 * The property that matters most here is the negative one: nothing a visitor
 * writes reaches the homepage before the practice has read it. That is checked
 * explicitly, along with approving, editing, rejecting and the honeypot.
 *
 * Seeds and sweeps its own rows, so DATABASE_URL is required.
 */
/*
 * `waitUntil: 'load'`, not 'networkidle'.
 *
 * The homepage's nav links are prefetched by the router, and Chromium keeps
 * those low-priority sockets open long after the page is usable — measured at
 * 45ms to `load` and 30s to `networkidle` on any navigation after the first in
 * a browser context. `networkidle` was waiting on the prefetch scheduler, not
 * on anything this suite cares about, and it timed out the second tab. Every
 * step below already waits on the element it is about to touch.
 */
import { chromium } from 'playwright'
import pg from 'pg'

const base = process.argv[2] ?? 'http://localhost:3100'
const username = process.argv[3] ?? '09392738157'
const password = process.argv[4] ?? '@123456789*'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required — the suite sweeps its own rows.')
  process.exit(1)
}
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL.replace('host.docker.internal', 'localhost'),
})

/** Every row this run creates carries the marker, so the sweep cannot overreach. */
const MARK = `آزمون‌خودکار-${Date.now().toString().slice(-6)}`
const QUOTE = `${MARK} — این یک نظر آزمایشی است که فقط برای بررسی خودکار سایت ثبت شده و باید بعد از اجرا حذف شود.`

let pass = 0
let fail = 0
const check = (label, ok, extra = '') => {
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`)
}

const sweep = () =>
  pool.query('delete from testimonial where quote like $1', [`%آزمون‌خودکار-%`])

await sweep()

const browser = await chromium.launch()

/* -------------------------------------------------- a visitor comments */

const context = await browser.newContext()
const page = await context.newPage()
await page.goto(`${base}/`, { waitUntil: 'load' })
await page.locator('#testimonials').scrollIntoViewIfNeeded()
await page.waitForTimeout(1200)

await page.getByRole('button', { name: 'ثبت نظر شما' }).click()
await page.getByRole('heading', { name: 'ثبت نظر' }).waitFor({ timeout: 15000 })
check('the comment form opens', true)

/* ------------------------------------------------------ validation */

// The browser's own bubble speaks the browser's language; on a Persian page it
// was telling people "Please lengthen this text…" in English. Nothing should
// be marked wrong before the first attempt to send.
const quoteHint = page.locator('#comment-quote-hint')
const nameHint = page.locator('#comment-name-hint')

check(
  'nothing is marked wrong before the first attempt',
  (await page.locator('#comment-quote[aria-invalid="true"]').count()) === 0
)

await page.locator('#comment-quote').fill('عالی هستید')
check(
  'a short comment says how much more is needed',
  ((await quoteHint.textContent()) ?? '').includes('کاراکتر دیگر لازم است'),
  (await quoteHint.textContent()) ?? ''
)

await page.getByRole('button', { name: 'ارسال نظر' }).click()
await page.waitForTimeout(600)
// The hint stays the actionable shortfall («۲۰ کاراکتر دیگر لازم است») rather
// than swapping to a generic sentence — it already says what to do, and two
// messages saying the same thing is noise.
check(
  'submitting while short marks the field and says what is missing, in Persian',
  (await page.locator('#comment-quote[aria-invalid="true"]').count()) === 1 &&
    ((await quoteHint.textContent()) ?? '').includes('کاراکتر دیگر لازم است')
)
check(
  'the empty name is marked too',
  (await page.locator('#comment-name[aria-invalid="true"]').count()) === 1 &&
    ((await nameHint.textContent()) ?? '').includes('نام'),
  (await nameHint.textContent()) ?? ''
)
check(
  'nothing was sent',
  (
    await pool.query('select count(*)::int n from testimonial where quote like $1', [
      '%عالی هستید%',
    ])
  ).rows[0].n === 0
)

await page.locator('#comment-quote').fill(QUOTE)
await page.waitForTimeout(300)
check(
  'the warning clears as soon as it is long enough',
  (await page.locator('#comment-quote[aria-invalid="true"]').count()) === 0 &&
    ((await quoteHint.textContent()) ?? '').includes('باقی مانده')
)

await page.locator('#comment-name').fill(MARK)
await page.locator('#comment-quote').fill(QUOTE)

// Iran is preselected; the picker opens from there.
check(
  'the country defaults to Iran',
  (
    (await page.locator('dialog button[aria-expanded]').first().textContent()) ?? ''
  ).includes('ایران')
)
await page.locator('dialog button[aria-expanded]').first().click()
const picker = page.locator('dialog')
await page.getByPlaceholder('جست‌وجوی کشور').fill('آمریکا')
await page.waitForTimeout(400)
check(
  'the United States reads as ایالات متحده آمریکا',
  ((await picker.textContent()) ?? '').includes('ایالات متحده آمریکا')
)
await page.getByPlaceholder('جست‌وجوی کشور').fill('انگلیس')
await page.waitForTimeout(400)
check(
  'the United Kingdom reads as انگلیس',
  ((await picker.textContent()) ?? '').includes('انگلیس')
)

await page.getByPlaceholder('جست‌وجوی کشور').fill('کانادا')
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'کانادا' }).first().click()

await page.getByRole('button', { name: 'ارسال نظر' }).click()
check(
  'submitting confirms receipt',
  await page
    .getByText('نظر شما ثبت شد')
    .waitFor({ timeout: 20000 })
    .then(() => true)
    .catch(() => false)
)

const stored = await pool.query(
  'select id, name, country_code, status from testimonial where quote like $1',
  [`${MARK}%`]
)
const row = stored.rows[0]
check('the comment is stored', Boolean(row), JSON.stringify(row ?? null))
check('it lands as pending, not published', row?.status === 'pending', row?.status)
check('the chosen country is kept', row?.country_code === 'CA', row?.country_code)

/* ------------------------------ it must not be on the homepage yet */

await page.goto(`${base}/`, { waitUntil: 'load' })
const beforeApproval = (await page.locator('#testimonials').textContent()) ?? ''
check('an unapproved comment is nowhere on the homepage', !beforeApproval.includes(MARK))

/* ------------------------------------------------------- the honeypot */

const bot = await context.newPage()
await bot.goto(`${base}/`, { waitUntil: 'load' })
await bot.locator('#testimonials').scrollIntoViewIfNeeded()
await bot.getByRole('button', { name: 'ثبت نظر شما' }).click()
await bot.getByRole('heading', { name: 'ثبت نظر' }).waitFor({ timeout: 15000 })
await bot.locator('#comment-name').fill(`${MARK} ربات`)
await bot.locator('#comment-quote').fill(`${MARK} ربات — ${QUOTE}`)
await bot.locator('input[name=website]').fill('https://spam.example', { force: true })
await bot.getByRole('button', { name: 'ارسال نظر' }).click()
await bot.waitForTimeout(2500)
const bots = await pool.query(
  'select count(*)::int n from testimonial where name like $1',
  [`%ربات%`]
)
check(
  'a filled honeypot is silently dropped',
  bots.rows[0].n === 0,
  String(bots.rows[0].n)
)
await bot.close()

/* ---------------------------------------------------------- moderation */

const adminContext = await browser.newContext()
const admin = await adminContext.newPage()
await admin.goto(`${base}/admin/login`, { waitUntil: 'domcontentloaded' })
await admin.locator('input[name=username]').fill(username)
await admin.locator('input[name=password]').fill(password)
await admin.locator('button[type=submit]').click()
await admin.waitForURL(/\/admin(\?|$)/, { timeout: 20000 })

const dashboard = (await admin.locator('body').textContent()) ?? ''
check(
  'the dashboard flags the waiting comment',
  dashboard.includes('نظرهای در انتظار بررسی') && dashboard.includes(MARK)
)

await admin.goto(`${base}/admin/testimonials?tab=pending`, {
  waitUntil: 'domcontentloaded',
})
const adminRow = admin.locator('li', { hasText: MARK }).first()
await adminRow.waitFor({ timeout: 15000 })
check('it appears in the pending queue', true)

/* ------------------------------------------------------------ editing */

const EDITED = `${MARK} — ویرایش‌شده. این متن پس از ویرایش باید روی سایت دیده شود و بعد از اجرا حذف شود.`
await adminRow.getByRole('button', { name: 'ویرایش' }).click()
await admin.getByRole('heading', { name: 'ویرایش نظر' }).waitFor({ timeout: 10000 })
await admin.locator('textarea[name=quote]').fill(EDITED)
await admin.getByRole('button', { name: 'ذخیره تغییرات' }).click()
await admin.getByText('تغییرات ذخیره شد.').waitFor({ timeout: 15000 })

const edited = await pool.query('select quote from testimonial where id = $1', [row.id])
check('the edit is saved', edited.rows[0]?.quote === EDITED)

/* ---------------------------------------------------------- approving */

await admin.goto(`${base}/admin/testimonials?tab=pending`, {
  waitUntil: 'domcontentloaded',
})
await admin
  .locator('li', { hasText: MARK })
  .first()
  .getByRole('button', { name: 'تأیید و انتشار' })
  .click()
await admin.waitForTimeout(2500)

const approved = await pool.query('select status from testimonial where id = $1', [
  row.id,
])
check('approving marks it published', approved.rows[0]?.status === 'approved')

await page.goto(`${base}/`, { waitUntil: 'load' })
await page.waitForTimeout(800)
const afterApproval = (await page.locator('#testimonials').textContent()) ?? ''
check('an approved comment reaches the homepage', afterApproval.includes(MARK))
check('the homepage shows the edited wording', afterApproval.includes('ویرایش‌شده'))

/* ---------------------------------------------------------- rejecting */

await admin.goto(`${base}/admin/testimonials?tab=approved`, {
  waitUntil: 'domcontentloaded',
})
const approvedRow = admin.locator('li', { hasText: MARK }).first()
await approvedRow.waitFor({ timeout: 15000 })
await approvedRow.getByRole('button', { name: 'رد', exact: true }).click()
await admin.getByRole('button', { name: 'رد کن' }).click()
await admin.waitForTimeout(2500)

await page.goto(`${base}/`, { waitUntil: 'load' })
const afterRejection = (await page.locator('#testimonials').textContent()) ?? ''
check('rejecting takes it back off the homepage', !afterRejection.includes(MARK))

/* ------------------------------------------------------------------ */

await browser.close()
const removed = await sweep()
console.log(`\nswept ${removed.rowCount} test row(s)`)
await pool.end()

console.log(`${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
