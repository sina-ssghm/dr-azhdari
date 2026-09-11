/**
 * End-to-end test of the online questionnaires.
 *
 *   node scripts/e2e-tests.mjs [baseUrl] [username] [password]
 *
 * Walks the whole flow the way a visitor and the practice actually use it:
 * price a test, request it, pay, upload a receipt, have it approved, follow the
 * issued link, answer every question, and read the result — then check the link
 * has turned read-only and that a refused payment revokes it.
 *
 * Seeds and sweeps its own rows, so DATABASE_URL is required.
 */
import { chromium } from 'playwright'
import pg from 'pg'

const base = process.argv[2] ?? 'http://localhost:3100'
const username = process.argv[3] ?? '09392738157'
const password = process.argv[4] ?? '@123456789*'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required — the suite seeds and sweeps its own rows.')
  process.exit(1)
}
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL.replace('host.docker.internal', 'localhost'),
})

/** Reserved for this run, so its orders are safe to delete. */
const PHONE_LOCAL = '9120009999'
const PHONE_E164 = '+989120009999'
const visitor = `آزمون‌گیرنده ${Date.now().toString().slice(-6)}`

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

const seen = async (locator, timeout = 15000) =>
  locator
    .waitFor({ timeout })
    .then(() => true)
    .catch(() => false)

await pool.query('delete from test_order where phone = $1', [PHONE_E164])

const browser = await chromium.launch()

/* ------------------------------------------------------- admin: pricing */

const adminContext = await browser.newContext()
const admin = await adminContext.newPage()
await admin.goto(`${base}/admin/login`, { waitUntil: 'domcontentloaded' })
await admin.locator('input[name=username]').fill(username)
await admin.locator('input[name=password]').fill(password)
await admin.locator('button[type=submit]').click()
await admin.waitForURL(/\/admin(\?|$)/, { timeout: 20000 })
ok('the admin can sign in')

await admin.goto(`${base}/admin/tests`, { waitUntil: 'domcontentloaded' })
await admin.locator('input[name="irt_bdi2"]').waitFor({ timeout: 15000 })

// Beck is charged for; Millon is free, so both branches get exercised.
await admin.locator('input[name="irt_bdi2"]').fill('450000')
await admin.locator('input[name="usdt_bdi2"]').fill('12')
await admin.locator('input[name="irt_mcmi"]').fill('0')
await admin.locator('input[name="usdt_mcmi"]').fill('0')
await admin.locator('main button[type=submit]').first().click()
check('test prices are saved', await seen(admin.getByText('تغییرات ذخیره شد.')))

const priced = await pool.query(
  'select price_irt, price_usdt from psy_test_price where test_id = $1',
  ['bdi2']
)
check(
  'the toman price reaches the database',
  Number(priced.rows[0]?.price_irt) === 450000,
  JSON.stringify(priced.rows[0])
)

/* ------------------------------------------------- public: request a test */

const context = await browser.newContext()
const page = await context.newPage()

await page.goto(`${base}/tests`, { waitUntil: 'domcontentloaded' })
check(
  'the test is listed publicly',
  await page.getByText('افسردگی بک').first().isVisible()
)

const listBody = (await page.locator('body').textContent()) ?? ''
check('the list shows the toman price in Persian digits', listBody.includes('۴۵۰٬۰۰۰'))

await page.goto(`${base}/tests/bdi2`, { waitUntil: 'domcontentloaded' })
check(
  'a paid test asks where the visitor lives',
  await page
    .getByText('محل اقامت شما')
    .isVisible()
    .catch(() => false)
)

await page.locator('input#test-name').fill(visitor)
await page.locator('input#test-phone').fill(PHONE_LOCAL)
await page.locator('main button[type=submit]').click()
const onPayment = await page
  .waitForURL(/\/tests\/order\//, { timeout: 20000 })
  .then(() => true)
  .catch(() => false)
check('a paid request lands on the payment page', onPayment)

const orderRef = page.url().split('/tests/order/')[1]
const payBody = (await page.locator('body').textContent()) ?? ''
check('the amount carries over', payBody.includes('۴۵۰٬۰۰۰'))

/* ---------------------------------------------------------- pay and upload */

await page.getByRole('button', { name: 'پرداخت کردم' }).click()
await page.getByText('فایل رسید را اینجا رها کنید').waitFor({ timeout: 15000 })
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)
await page
  .locator('input#receipt')
  .setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: png })
await page.getByRole('button', { name: /ارسال رسید/ }).click()
check(
  'the receipt is accepted and the order awaits review',
  await seen(page.getByText('رسید شما در انتظار تأیید است'), 40000)
)

const beforeApproval = await pool.query(
  'select access_token from test_order where order_ref = $1',
  [orderRef]
)
check(
  'no test link exists before approval',
  beforeApproval.rows[0]?.access_token === null,
  JSON.stringify(beforeApproval.rows[0])
)

/* ------------------------------------------------------- admin: dashboard */

await admin.goto(`${base}/admin`, { waitUntil: 'domcontentloaded' })
const dashboard = (await admin.locator('body').textContent()) ?? ''
check(
  'the dashboard flags the test receipt as awaiting review',
  dashboard.includes('رسیدهای آزمون در انتظار بررسی') && dashboard.includes(visitor)
)
check(
  'the dashboard banner links to the test queue',
  (await admin.locator('a[href="/admin/tests?tab=awaiting"]').count()) > 0
)

/* -------------------------------------------------------- admin: approve */

await admin.goto(`${base}/admin/tests?tab=awaiting`, { waitUntil: 'domcontentloaded' })
const row = admin.locator('li', { hasText: visitor }).first()
check('the order appears in the awaiting queue', await seen(row))

// The tabs intercept their own click to run the navigation inside a
// transition, so clicking one — rather than visiting its URL — is the only way
// to catch a preventDefault that never navigates.
await admin.getByRole('link', { name: /^همه/ }).click()
await admin.waitForURL(/tab=all/, { timeout: 15000 })
check(
  'clicking a filter tab navigates',
  admin.url().includes('tab=all') &&
    (await admin.locator('li', { hasText: visitor }).count()) > 0
)
await admin.goto(`${base}/admin/tests?tab=awaiting`, { waitUntil: 'domcontentloaded' })

await row.getByRole('button', { name: 'تأیید پرداخت' }).first().click()
await admin.waitForTimeout(2500)

const approved = await pool.query(
  'select access_token, payment_status from test_order where order_ref = $1',
  [orderRef]
)
const token = approved.rows[0]?.access_token
check(
  'approving issues the private link',
  Boolean(token) && approved.rows[0].payment_status === 'paid',
  JSON.stringify(approved.rows[0])
)

/* --------------------------------------------------------- take the test */

await page.goto(`${base}/t/${token}`, { waitUntil: 'domcontentloaded' })
check(
  'the link opens the questionnaire at the first question',
  await seen(page.getByText('۱ از ۲۱'))
)

// Answer the first question, then step back to prove the answer is retained.
await page.locator('button[aria-pressed]').first().click()
check(
  'choosing an answer advances automatically',
  await seen(page.getByText('۲ از ۲۱'), 10000)
)

await page.getByRole('button', { name: 'سؤال قبلی' }).click()
await page.getByText('۱ از ۲۱').waitFor({ timeout: 10000 })
check(
  'going back shows the previous answer still selected',
  (await page
    .locator('button[aria-pressed="true"]')
    .count()
    .catch(() => 0)) > 0
)

// Q9 is the self-harm item; answering it at severity 3 must trigger the notice.
for (let i = 0; i < 21; i++) {
  const choices = page.locator('button[aria-pressed]')
  await choices.first().waitFor({ timeout: 10000 })
  const heading = (await page.locator('p[tabindex="-1"]').textContent()) ?? ''
  await choices.nth(heading.includes('افکار خودکشی') ? 3 : 0).click()
  await page.waitForTimeout(320)
}

check(
  'answering the last question opens the review step',
  await seen(page.getByText('بازبینی پاسخ‌ها').first())
)

const reviewBody = (await page.locator('body').textContent()) ?? ''
check('the review step shows every question answered', !reviewBody.includes('بدون پاسخ'))

await page.getByRole('button', { name: /ثبت و مشاهده نتیجه/ }).click()
check(
  'submitting shows the result',
  await seen(page.getByText('نتیجه آزمون').first(), 30000)
)

const resultBody = (await page.locator('body').textContent()) ?? ''
check('the self-harm answer triggers the safety notice', resultBody.includes('توجه فوری'))
check('the total is shown', resultBody.includes('نمره کل'))

// These pages carry no site header, so the way out has to be on the page.
check(
  'the result offers a way back to the homepage',
  (await page.getByRole('link', { name: 'بازگشت به صفحه اصلی' }).count()) > 0
)

const stored = await pool.query('select result from test_order where order_ref = $1', [
  orderRef,
])
const scored = stored.rows[0]?.result
check(
  'the scored result is stored server-side',
  Boolean(scored) && typeof scored.total === 'number' && Boolean(scored.safety),
  scored ? `total=${scored.total}` : 'no result'
)

/* ------------------------------------------------- the link is now spent */

await page.goto(`${base}/t/${token}`, { waitUntil: 'domcontentloaded' })
const revisit = (await page.locator('body').textContent()) ?? ''
check(
  'revisiting the link shows only the result, never the questions again',
  revisit.includes('نتیجه آزمون') && !revisit.includes('از ۲۱')
)

/* ------------------------------------------------------- a free test runs */

const free = await context.newPage()
await free.goto(`${base}/tests/mcmi`, { waitUntil: 'domcontentloaded' })
check(
  'a free test does not ask where the visitor lives',
  !(await free
    .getByText('محل اقامت شما')
    .isVisible()
    .catch(() => false))
)

await free.locator('input#test-name').fill(`${visitor} رایگان`)
await free.locator('input#test-phone').fill(PHONE_LOCAL)
await free.locator('main button[type=submit]').click()
const straightIn = await free
  .waitForURL(/\/t\//, { timeout: 20000 })
  .then(() => true)
  .catch(() => false)
check('a free test skips payment and opens straight away', straightIn)

const freeToken = free.url().split('/t/')[1]
await free
  .getByText('۱ از ۵۰')
  .waitFor({ timeout: 15000 })
  .catch(() => {})
for (let i = 0; i < 50; i++) {
  const choices = free.locator('button[aria-pressed]')
  await choices.first().waitFor({ timeout: 10000 })
  await choices.nth(1).click() // «خیر» throughout
  await free.waitForTimeout(300)
}
await free.getByRole('button', { name: /ثبت و ارسال پاسخ‌ها/ }).click({ timeout: 20000 })
check(
  'a clinical test acknowledges without disclosing scores',
  await seen(free.getByText('پاسخ‌های شما ثبت شد'), 30000)
)

const clinicalBody = (await free.locator('body').textContent()) ?? ''
check(
  'the clinical scales are never shown to the taker',
  !clinicalBody.includes('نمره کل') && !clinicalBody.includes('اسکیزوئید')
)

const clinicalRow = await pool.query(
  'select result from test_order where access_token = $1',
  [freeToken]
)
const clinicalScales = clinicalRow.rows[0]?.result?.scales ?? []
check(
  'the therapist still gets all fourteen clinical scales',
  clinicalScales.length === 14,
  String(clinicalScales.length)
)

/* --------------------------- the clinical result is flagged for the admin */

await admin.goto(`${base}/admin/tests?tab=paid`, { waitUntil: 'domcontentloaded' })

// Matched on the test's own name, not the visitor's: this run's names share a
// prefix, so `hasText: visitor` would match both rows.
const clinicalRowUi = admin.locator('li', { hasText: 'غربالگری بالینی میلون' }).first()
await clinicalRowUi.waitFor({ timeout: 15000 })
const clinicalText = (await clinicalRowUi.textContent()) ?? ''
check(
  'a completed clinical screening is badged as needing the therapist',
  clinicalText.includes('گزارش بالینی')
)
check(
  'a free order reads «رایگان» rather than «۰ تومان»',
  clinicalText.includes('رایگان') && !clinicalText.includes('۰ تومان'),
  clinicalText.slice(0, 70)
)

const selfKnowledgeRow = admin.locator('li', { hasText: 'افسردگی بک' }).first()
check(
  'a self-knowledge test is not badged that way',
  !((await selfKnowledgeRow.textContent()) ?? '').includes('گزارش بالینی'),
  ((await selfKnowledgeRow.textContent()) ?? '').slice(0, 60)
)

/* ------------------------------------------- refusing a payment revokes it */

const second = await context.newPage()
await second.goto(`${base}/tests/bdi2`, { waitUntil: 'domcontentloaded' })
await second.locator('input#test-name').fill(`${visitor} رد`)
await second.locator('input#test-phone').fill(PHONE_LOCAL)
await second.locator('main button[type=submit]').click()
await second.waitForURL(/\/tests\/order\//, { timeout: 20000 })
const rejectRef = second.url().split('/tests/order/')[1]

// Approve it first, so the refusal has a live link to revoke.
await admin.goto(`${base}/admin/tests?tab=all`, { waitUntil: 'domcontentloaded' })
const target = admin.locator('li', { hasText: `${visitor} رد` }).first()
await target.waitFor({ timeout: 15000 })
await target.getByRole('button', { name: 'تأیید پرداخت' }).first().click()
await admin.waitForTimeout(2000)
const issued = await pool.query(
  'select access_token from test_order where order_ref = $1',
  [rejectRef]
)
const rejectToken = issued.rows[0]?.access_token
check('the second order was issued a link', Boolean(rejectToken))

await admin.reload({ waitUntil: 'domcontentloaded' })
const again = admin.locator('li', { hasText: `${visitor} رد` }).first()
await again.getByRole('button', { name: 'گزینه‌های بیشتر' }).click()
await again.getByRole('button', { name: 'رد پرداخت' }).click()
await admin.getByRole('button', { name: 'رد کن' }).click()
await admin.waitForTimeout(2000)

await second.goto(`${base}/t/${rejectToken}`, { waitUntil: 'domcontentloaded' })
const gone = (await second.locator('body').textContent()) ?? ''
check(
  'refusing a payment kills a link that had already been issued',
  gone.includes('این لینک معتبر نیست')
)
check(
  'the dead-link page offers a way back to the homepage',
  (await second.getByRole('link', { name: 'بازگشت به صفحه اصلی' }).count()) > 0
)

/* ------------------------------------------------------------------ done */

await browser.close()
await pool.query('delete from test_order where phone = $1', [PHONE_E164])
await pool.end()

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
