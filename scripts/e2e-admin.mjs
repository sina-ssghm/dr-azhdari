/**
 * End-to-end smoke test of the admin panel and the public booking flow.
 *
 *   npm run e2e            # against http://localhost:3100
 *   node scripts/e2e-admin.mjs [baseUrl] [username] [password]
 *
 * Signs in, saves prices, adds working hours, creates a discount code, books
 * an appointment from the admin form, then checks the public /booking page
 * offers slots generated from those hours and prices them correctly.
 *
 * NOTE ON SELECTORS: the sidebar's sign-out form comes before <main> in the
 * DOM, so a bare `button[type=submit]` matches sign-out first. Everything here
 * is scoped to `main` for that reason.
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:3100'
const username = process.argv[3] ?? '09392738157'
const password = process.argv[4] ?? '@123456789*'
const out = '.screenshots'

/**
 * The booking this run creates. Unique per run on purpose: the rows are real
 * and accumulate, so a fixed name would make `.first()` pick up an already-
 * confirmed booking from a previous run and the confirm step would hang.
 */
const visitor = `مراجع آزمایشی ${Date.now().toString().slice(-6)}`

await mkdir(out, { recursive: true })

/**
 * Booked only by this script. Both forms are listed because admin-created rows
 * still store the local format while the public flow now stores E.164.
 */
const TEST_PHONES = [
  // Admin-created rows store what was typed; the public flow stores E.164.
  // Both forms are listed so rows written before that change are still swept —
  // otherwise they sit in the schedule forever and slowly starve the
  // 120-minute check of a free two-hour window.
  '09120000000',
  '+989120000000',
  '09120000001',
  '+989120000001',
  '09120000002',
  '+989120000002',
  '09120000003',
  '+989120000003',
  '09120000005',
  '+989120000005',
  // Booked by runs before the fixture numbers moved into the reserved
  // 0912 000 xxxx range; kept so those rows are still swept.
  '09123456789',
  '+989123456789',
]

/**
 * Drop the previous run's bookings.
 *
 * Every run reserves real hours, so without this the schedule fills up and
 * later runs fail for reasons that have nothing to do with the code — a
 * 120-minute session in particular needs a two-hour clear window. Cleaning at
 * the *start* rather than the end leaves a failed run's rows in place to be
 * inspected. Needs DATABASE_URL; without it the run still works, just dirtier.
 */
async function clearTestBookings() {
  if (!process.env.DATABASE_URL) return 'skipped — no DATABASE_URL'
  const { default: pg } = await import('pg')
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL.replace(
      'host.docker.internal',
      'localhost'
    ),
  })
  try {
    const { rowCount } = await pool.query(
      'delete from appointment where phone = any($1)',
      [TEST_PHONES]
    )
    return `${rowCount} row(s) removed`
  } finally {
    await pool.end()
  }
}

console.log(`clean  ${await clearTestBookings()}`)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
const main = () => page.locator('main')

const steps = []
const check = (name, ok, detail = '') => {
  steps.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}
const saved = () => page.getByText('تغییرات ذخیره شد').count()

const faToEn = (s) => s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))

/**
 * Total appointments, read from the "همه" tab badge.
 * Counting visible rows cannot work: the list is paged at 15, so a new row
 * does not change how many are on screen.
 */
const totalAppointments = async () => {
  const text = await main().getByRole('link', { name: /^همه/ }).innerText()
  return Number(faToEn(text).replace(/\D/g, ''))
}

try {
  // 1. Unauthenticated admin redirects to login.
  await page.goto(`${base}/admin/prices`, { waitUntil: 'networkidle' })
  check('unauthenticated admin redirects to login', page.url().includes('/admin/login'))

  // 2. Wrong password rejected.
  await page.fill('#username', username)
  await page.fill('#password', 'definitely-wrong')
  await page.getByRole('button', { name: 'ورود' }).click()
  await page.waitForTimeout(1500)
  check('wrong password rejected', page.url().includes('/admin/login'))

  // 3. Correct credentials sign in.
  await page.fill('#username', username)
  await page.fill('#password', password)
  await page.getByRole('button', { name: 'ورود' }).click()
  await page.waitForURL((u) => !u.pathname.includes('/admin/login'), { timeout: 15000 })
  check('sign in succeeds', page.url().endsWith('/admin'))
  await page.screenshot({ path: `${out}/admin-dashboard.png`, fullPage: true })

  // 4. Prices — one tier per (service, duration), three tariffs each. The
  //    abroad toman price is deliberately different from the domestic one, so
  //    a booking charged the wrong rail is visible in the total.
  await page.goto(`${base}/admin/prices`, { waitUntil: 'networkidle' })
  const tiers = [
    ['individual_60', '2500000', '3000000', '35'],
    ['couple_90', '3500000', '4200000', '50'],
    ['couple_120', '4500000', '5400000', '65'],
    ['hypnotherapy_60', '4000000', '4800000', '60'],
  ]
  for (const [suffix, irt, irtAbroad, usdt] of tiers) {
    await page.fill(`#irt_${suffix}`, irt)
    await page.fill(`#irtAbroad_${suffix}`, irtAbroad)
    await page.fill(`#usdt_${suffix}`, usdt)
  }
  await main().getByRole('button', { name: 'ذخیره تغییرات' }).click()
  await page.waitForTimeout(2000)
  check('per-duration prices saved', (await saved()) > 0, `${tiers.length} tiers`)
  await page.screenshot({ path: `${out}/admin-prices.png`, fullPage: true })

  // 4b. Payment settings, which the payment page reads.
  await page.goto(`${base}/admin/settings`, { waitUntil: 'networkidle' })
  await page.fill('#card_number', '6037997912345678')
  await page.fill('#card_sheba', 'IR820540102680020817909002')
  await page.fill('#card_holder', 'زهره اژدری')
  await page.fill('#usdt_address', 'TXk8rQSAvPvBBM2yTgTfstDdFsPbc4Dbo3')
  await page.fill('#usdt_network', 'TRC20')
  await main().getByRole('button', { name: 'ذخیره تغییرات' }).click()
  await page.waitForTimeout(2000)
  check('payment settings saved', (await saved()) > 0)
  await page.screenshot({ path: `${out}/admin-settings.png`, fullPage: true })

  // 4c. The card and sheba fields are grouped, digits-only, and length-checked.
  // The pasted 'IR' above must have been dropped: the prefix is fixed chrome.
  await page.goto(`${base}/admin/settings`, { waitUntil: 'networkidle' })
  const cardValue = await page.locator('#card_number').inputValue()
  check('card number is grouped', cardValue === '6037 9979 1234 5678', cardValue)
  const shebaValue = await page.locator('#card_sheba').inputValue()
  check(
    'sheba field holds the 24 digits without IR',
    shebaValue === '8205 4010 2680 0208 1790 9002',
    shebaValue
  )

  await page.fill('#card_number', '603799791234')
  check(
    'a short card number is flagged while typing',
    (await page.locator('#card_number[aria-invalid="true"]').count()) > 0
  )
  await main().getByRole('button', { name: 'ذخیره تغییرات' }).click()
  await page.waitForTimeout(1800)
  check(
    'a short card number is refused by the server',
    (await page.getByText('شماره کارت باید دقیقاً ۱۶ رقم باشد.').count()) > 0 &&
      (await saved()) === 0
  )

  // Letters cannot be typed in at all, so the stored value stays clean.
  await page.fill('#card_number', '6037-9979-1234-5678')
  check(
    'separators and letters are stripped',
    (await page.locator('#card_number').inputValue()) === '6037 9979 1234 5678'
  )
  await main().getByRole('button', { name: 'ذخیره تغییرات' }).click()
  await page.waitForTimeout(1800)
  check('a valid card number saves again', (await saved()) > 0)

  // 5. Working hours — one 08:00–21:00 span on every weekday.
  //    Existing spans are removed first: re-running would otherwise add an
  //    overlapping duplicate, which the server correctly rejects.
  await page.goto(`${base}/admin/hours`, { waitUntil: 'networkidle' })
  const removeButtons = main().getByRole('button', { name: 'حذف بازه' })
  for (let n = await removeButtons.count(); n > 0; n -= 1) {
    await removeButtons.first().click()
  }
  const addButtons = main().getByRole('button', { name: '+ بازه' })
  const days = await addButtons.count()
  for (let i = 0; i < days; i += 1) await addButtons.nth(i).click()
  // Times are typed now, four digits each. 08:23 is deliberately off the
  // half-hour grid — the <select> this replaced could not express it at all.
  const starts = main().locator('input[aria-label^="شروع بازه"]')
  const ends = main().locator('input[aria-label^="پایان بازه"]')
  const spans = await starts.count()
  for (let i = 0; i < spans; i += 1) {
    await starts.nth(i).fill('0823')
    await ends.nth(i).fill('2100')
  }
  check(
    'four digits become an off-grid time',
    (await starts.first().inputValue()) === '08:23',
    await starts.first().inputValue()
  )

  // A leading 3-9 cannot start a two-digit hour, so three digits are enough.
  await starts.nth(1).fill('823')
  check(
    'three digits work when the hour is unambiguous',
    (await starts.nth(1).inputValue()) === '08:23',
    await starts.nth(1).inputValue()
  )

  // Tapping the field selects it all, so typing replaces rather than appends.
  await starts.nth(2).click()
  const selection = await starts.nth(2).evaluate((el) => ({
    start: el.selectionStart,
    end: el.selectionEnd,
    length: el.value.length,
  }))
  check(
    'clicking an hour selects the whole value',
    selection.start === 0 && selection.end === selection.length,
    `${selection.start}–${selection.end} of ${selection.length}`
  )
  await page.keyboard.type('0930')
  check(
    'typing over the selection replaces the time',
    (await starts.nth(2).inputValue()) === '09:30',
    await starts.nth(2).inputValue()
  )

  // Focus fires once, so a second click has to re-select by itself — otherwise
  // the next digit is inserted into the middle of the old value.
  await starts.nth(2).click()
  await page.keyboard.type('745')
  check(
    'clicking an already-focused hour starts it over',
    (await starts.nth(2).inputValue()) === '07:45',
    await starts.nth(2).inputValue()
  )
  await starts.nth(2).fill('0823')

  // Out of range is clamped rather than rejected into an invalid schedule.
  await ends.first().fill('2999')
  check(
    'an impossible time is clamped',
    (await ends.first().inputValue()) === '23:59',
    await ends.first().inputValue()
  )
  await ends.first().fill('2100')

  await main().getByRole('button', { name: 'ذخیره تغییرات' }).click()
  await page.waitForTimeout(2000)
  check('working hours saved', (await saved()) > 0, `${days} day(s) × 1 span`)

  await page.reload({ waitUntil: 'networkidle' })
  check(
    'an off-grid start survives the round trip',
    (await main().locator('input[aria-label^="شروع بازه"]').first().inputValue()) ===
      '08:23'
  )
  await page.screenshot({ path: `${out}/admin-hours.png`, fullPage: true })

  // 6. Discount codes: one percentage, one fixed with both currencies.
  await page.goto(`${base}/admin/discounts`, { waitUntil: 'networkidle' })

  // Clear any leftovers so "created" means created, not "already there".
  for (const code of ['E2ETEST20', 'E2EFIXED']) {
    const row = main().locator('li').filter({ hasText: code })
    if ((await row.count()) > 0) {
      await row.first().getByRole('button', { name: 'حذف' }).click()
      await page.waitForTimeout(600)
      await page
        .locator('dialog[open]')
        .getByRole('button', { name: /حذف کن/ })
        .click()
      await page.waitForTimeout(1800)
    }
  }
  check(
    'leftover test codes cleared',
    (await main().getByText('E2ETEST20').count()) === 0
  )

  await main().getByRole('button', { name: 'کد تخفیف جدید' }).click()
  await page.waitForTimeout(600)
  let sheet = page.locator('dialog[open]')
  check('discount modal opens', (await sheet.count()) > 0)
  await sheet.locator('#code').fill('E2ETEST20')
  await sheet.getByRole('radio', { name: 'درصدی' }).check()
  await sheet.locator('#percent').fill('20')
  await sheet.getByRole('button', { name: 'افزودن کد' }).click()
  await page.waitForTimeout(2200)
  check('percentage discount created', (await main().getByText('E2ETEST20').count()) > 0)

  // A fixed code must accept a value in each currency.
  await main().getByRole('button', { name: 'کد تخفیف جدید' }).click()
  await page.waitForTimeout(600)
  sheet = page.locator('dialog[open]')
  await sheet.locator('#code').fill('E2EFIXED')
  await sheet.getByRole('radio', { name: 'مبلغ ثابت' }).check()
  await page.waitForTimeout(400)
  await sheet.locator('#amountIrt').fill('500000')
  const grouped = await sheet.locator('#amountIrt').inputValue()
  check('money input groups thousands', grouped === '500,000', grouped)
  await sheet.locator('#amountUsdt').fill('5')
  await sheet.getByRole('button', { name: 'افزودن کد' }).click()
  await page.waitForTimeout(2200)
  check('fixed discount created', (await main().getByText('E2EFIXED').count()) > 0)
  check(
    'fixed discount lists both currencies',
    (await main().locator('li').filter({ hasText: 'E2EFIXED' }).innerText()).includes(
      'تتر'
    )
  )
  await page.screenshot({ path: `${out}/admin-discounts.png`, fullPage: true })

  // 7. Admin books an appointment with no payment, via the modal.
  await page.goto(`${base}/admin/appointments`, { waitUntil: 'networkidle' })
  const before = await totalAppointments()

  await main().getByRole('button', { name: 'ثبت نوبت جدید' }).click()
  await page.waitForTimeout(600)
  const dialog = page.locator('dialog[open]')
  check('modal opens', (await dialog.count()) > 0)
  await page.screenshot({ path: `${out}/admin-new-appointment-modal.png` })

  // Day cells are labelled with the Jalali date and show a Persian numeral.
  const dayCells = dialog
    .locator('button:not([disabled])')
    .filter({ hasText: /^[۰-۹]{1,2}$/ })
  const dayCount = await dayCells.count()
  check('jalali calendar renders selectable days', dayCount > 0, `${dayCount} day(s)`)

  /**
   * Finds a day in the modal's calendar that still has a free start.
   *
   * Walks the visible month from its last day back, then moves to the next
   * month and tries again. Both are needed: earlier runs book a slot each
   * time, and on the last day of a Jalali month the calendar offers exactly
   * one selectable day whose remaining hours are all in the past.
   */
  const findFreeDay = async (sheet, months = 3) => {
    const slots = sheet
      .locator('button:not([disabled])')
      .filter({ hasText: /^[۰-۹]{2}:[۰-۹]{2}$/ })

    for (let month = 0; month < months; month += 1) {
      if (month > 0) {
        await sheet.getByRole('button', { name: 'ماه بعد' }).click()
        await page.waitForTimeout(900)
      }
      const days = sheet
        .locator('button:not([disabled])')
        .filter({ hasText: /^[۰-۹]{1,2}$/ })
      for (let i = (await days.count()) - 1; i >= 0; i -= 1) {
        await days.nth(i).click()
        await page.waitForTimeout(1500)
        const found = await slots.count()
        if (found > 0) return found
      }
    }
    return 0
  }

  const freeSlots = dialog
    .locator('button:not([disabled])')
    .filter({ hasText: /^[۰-۹]{2}:[۰-۹]{2}$/ })

  const slotCount = await findFreeDay(dialog)
  check('a day with free slots was found', slotCount > 0, `${slotCount} slot(s)`)
  await freeSlots.nth(slotCount - 1).click()

  await page.fill('#fullName', 'آزمون خودکار')
  await page.fill('#phone', '09120000000')
  await dialog.getByRole('button', { name: 'ثبت نوبت' }).click()
  await page.waitForTimeout(2500)

  check('modal closes after submit', (await page.locator('dialog[open]').count()) === 0)
  const after = await totalAppointments()
  check('admin appointment created', after === before + 1, `${before} → ${after}`)
  await page.screenshot({ path: `${out}/admin-appointments.png`, fullPage: true })

  // 7a2. Couple therapy runs 90 or 120 minutes. The admin form has to ask, and
  // the stored duration has to match — the overlap constraint is built from it,
  // so a 120-minute session recorded as 60 reserves only its first hour.
  await main().getByRole('button', { name: 'ثبت نوبت جدید' }).click()
  await page.waitForTimeout(700)
  const longDialog = page.locator('dialog[open]')
  await longDialog.getByRole('radio', { name: /مشاوره روابط و خانواده/ }).click()
  await page.waitForTimeout(500)
  check(
    'a multi-length service asks for the duration',
    (await longDialog.getByRole('button', { name: '۱۲۰ دقیقه' }).count()) > 0
  )
  await longDialog.getByRole('button', { name: '۱۲۰ دقیقه' }).click()
  await page.waitForTimeout(1500)

  const longSlots = longDialog
    .locator('button:not([disabled])')
    .filter({ hasText: /^[۰-۹]{2}:[۰-۹]{2}$/ })

  const longCount = await findFreeDay(longDialog)
  check('a 120-minute session finds a start', longCount > 0, `${longCount} slot(s)`)
  const longStart = await longSlots.first().innerText()
  await longSlots.first().click()
  await page.fill('#fullName', 'آزمون جلسه بلند')
  await page.fill('#phone', '09120000001')
  await longDialog.getByRole('button', { name: 'ثبت نوبت' }).click()
  await page.waitForTimeout(2500)
  check(
    'the long appointment was accepted',
    (await page.locator('dialog[open]').count()) === 0
  )

  // The proof it stored 120 and not the column default: the hour one step after
  // it is now unavailable, which a 60-minute row would have left free.
  await main().getByRole('button', { name: 'ثبت نوبت جدید' }).click()
  await page.waitForTimeout(700)
  const probe = page.locator('dialog[open]')
  await probe.getByRole('radio', { name: /مشاوره فردی/ }).click()
  await page.waitForTimeout(1500)
  const probeDay = probe
    .locator('button:not([disabled])')
    .filter({ hasText: /^[۰-۹]{1,2}$/ })
  // Same day the long appointment landed on: the last one that had room.
  await probeDay.nth((await probeDay.count()) - 1).click()
  await page.waitForTimeout(1500)
  const stillFree = await probe
    .locator('button:not([disabled])')
    .filter({ hasText: new RegExp(`^${longStart}$`) })
    .count()
  check(
    'a 120-minute booking blocks its whole span',
    stillFree === 0,
    `${longStart} offered again: ${stillFree > 0}`
  )
  await probe
    .getByRole('button', { name: 'بستن' })
    .click()
    .catch(() => {})
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

  // 7b. Status filter drives the list from the URL.
  await main()
    .getByRole('link', { name: /^لغو شده/ })
    .click()
  await page.waitForTimeout(1200)
  check('filter updates the URL', page.url().includes('status=cancelled'), page.url())
  const cancelledOnly = await main().getByText('رزرو شده', { exact: true }).count()
  check('filter excludes other statuses', cancelledOnly === 0)

  // The «در انتظار» tab, and the groups partitioning the whole set: every
  // appointment belongs to exactly one, so the tab counts must sum to the total.
  await main()
    .getByRole('link', { name: /^در انتظار/ })
    .click()
  await page.waitForTimeout(1200)
  check(
    'pending filter updates the URL',
    page.url().includes('status=pending'),
    page.url()
  )

  // Scoped to the filtered list: the waiting-receipts section above it is
  // deliberately outside the filters, and its rows carry no status badge.
  const listPanel = main()
    .locator('section')
    .filter({ has: page.locator('nav[aria-label="فیلتر نوبت‌ها"]') })
  const pendingRows = listPanel
    .locator('li')
    .filter({ has: page.getByRole('button', { name: 'حذف', exact: true }) })
  const pendingTexts = await pendingRows.evaluateAll((els) =>
    els.map((el) => el.innerText)
  )
  const notPending = pendingTexts.filter((text) => !text.includes('در انتظار'))
  check(
    'the pending filter shows only pending appointments',
    pendingTexts.length > 0 && notPending.length === 0,
    notPending.length
      ? `stray: ${notPending[0]?.replace(/\s+/g, ' ').slice(0, 60)}`
      : `${pendingTexts.length} row(s)`
  )

  const tabCounts = await main()
    .locator('nav[aria-label="فیلتر نوبت‌ها"] a')
    .evaluateAll((els) => els.map((el) => el.innerText.replace(/\s+/g, ' ').trim()))
  const numbers = tabCounts.map((text) => Number(faToEn(text).replace(/\D/g, '')) || 0)
  check(
    'the status tabs add up to the total',
    numbers.length === 5 &&
      numbers[0] === numbers.slice(1).reduce((sum, n) => sum + n, 0),
    tabCounts.join(' | ')
  )

  await main().getByRole('link', { name: /^همه/ }).click()
  await page.waitForTimeout(1200)
  check('filter resets to all', !page.url().includes('status='))

  // 7c. Deleting asks first.
  await main().getByRole('button', { name: 'حذف' }).first().click()
  await page.waitForTimeout(600)
  const confirmOpen = await page.locator('dialog[open]').count()
  check('delete asks for confirmation', confirmOpen > 0)
  await page.screenshot({ path: `${out}/admin-delete-confirm.png` })
  await page.locator('dialog[open]').getByRole('button', { name: 'انصراف' }).click()
  await page.waitForTimeout(600)
  check(
    'cancelling the dialog aborts the delete',
    (await page.locator('dialog[open]').count()) === 0
  )

  // 7c-ii. Secondary actions live behind the overflow menu, so the row itself
  // stays down to the receipt and the two destructive buttons.
  // Identified by its delete button — the status tabs are list items too.
  const appointmentRow = () =>
    main()
      .locator('li')
      .filter({ has: page.getByRole('button', { name: 'حذف', exact: true }) })
      .first()

  const firstRow = appointmentRow()
  check(
    'secondary actions are hidden until asked for',
    (await firstRow.getByRole('button', { name: 'ویرایش' }).count()) === 0 &&
      (await firstRow.getByRole('button', { name: 'حذف', exact: true }).count()) === 1
  )
  await firstRow.getByRole('button', { name: 'گزینه‌های بیشتر' }).click()
  await page.waitForTimeout(400)
  check(
    'the overflow menu reveals them',
    (await firstRow.getByRole('button', { name: 'ویرایش' }).count()) > 0
  )

  // 7c-iii. Editing an appointment.
  await firstRow.getByRole('button', { name: 'ویرایش' }).click()
  await page.waitForTimeout(800)
  const editDialog = page.locator('dialog[open]')
  check('edit modal opens', (await editDialog.count()) > 0)

  // The stored values must be pre-filled, and the current slot still selectable.
  const prefilled = await editDialog.locator('#fullName').inputValue()
  check('edit form is pre-filled', prefilled.length > 0, prefilled)

  const renamed = 'آزمون ویرایش‌شده'
  await editDialog.locator('#fullName').fill(renamed)
  await editDialog.getByRole('button', { name: 'ذخیره تغییرات' }).click()
  await page.waitForTimeout(2500)
  check(
    'edit modal closes after save',
    (await page.locator('dialog[open]').count()) === 0
  )
  check('edited name is persisted', (await main().getByText(renamed).count()) > 0)

  // Put it back so later search assertions still match.
  await appointmentRow().getByRole('button', { name: 'گزینه‌های بیشتر' }).click()
  await page.waitForTimeout(400)
  await appointmentRow().getByRole('button', { name: 'ویرایش' }).click()
  await page.waitForTimeout(800)
  await page.locator('dialog[open] #fullName').fill('آزمون خودکار')
  await page
    .locator('dialog[open]')
    .getByRole('button', { name: 'ذخیره تغییرات' })
    .click()
  await page.waitForTimeout(2500)

  // 7d. Search by name, then by phone typed with Persian digits.
  await page.fill('#appointment-search', 'آزمون خودکار')
  await main().getByRole('button', { name: 'جستجو' }).click()
  await page.waitForTimeout(1500)
  check('search by name filters the list', page.url().includes('q='), page.url())
  const named = await main().getByText('آزمون خودکار').count()
  check('search by name returns matches', named > 0, `${named} row(s)`)

  await page.goto(`${base}/admin/appointments?q=${encodeURIComponent('۰۹۱۲')}`, {
    waitUntil: 'networkidle',
  })
  // Queried in Persian, stored in Latin, and now rendered in Persian too.
  const byPhone = await main().getByText('۰۹۱۲۰۰۰۰۰۰۰').count()
  check('persian digits match a latin-stored phone', byPhone > 0, `${byPhone} row(s)`)

  await page.goto(`${base}/admin/appointments?q=zzzz-no-such-person`, {
    waitUntil: 'networkidle',
  })
  check(
    'a search with no matches shows the empty state',
    (await main().getByText('نوبتی با این فیلترها پیدا نشد').count()) > 0
  )

  // 7e. Date range: a window far in the past must exclude everything.
  await page.goto(`${base}/admin/appointments?from=2000-01-01&to=2000-01-31`, {
    waitUntil: 'networkidle',
  })
  check(
    'date range excludes out-of-range appointments',
    (await main().getByText('نوبتی با این فیلترها پیدا نشد').count()) > 0
  )

  // 7f. Pagination appears once there is more than one page.
  await page.goto(`${base}/admin/appointments`, { waitUntil: 'networkidle' })
  const pager = main().getByRole('navigation', { name: 'صفحه‌بندی نوبت‌ها' })
  const paged = (await pager.count()) > 0
  if (paged) {
    await pager.getByRole('link', { name: /بعدی/ }).click()
    await page.waitForTimeout(1500)
    check('pagination moves to page 2', page.url().includes('page=2'), page.url())
  } else {
    check('pagination hidden with a single page', true, 'not enough rows yet')
  }

  // An out-of-range ?page= must clamp to the last page, not render empty.
  await page.goto(`${base}/admin/appointments?page=99`, { waitUntil: 'networkidle' })
  const clampedRows = await main().locator('li').count()
  check(
    'out-of-range page clamps instead of showing nothing',
    clampedRows > 0,
    `${clampedRows} row(s)`
  )
  await page.screenshot({ path: `${out}/admin-appointments-filters.png`, fullPage: true })

  // 7g. Mobile: the filter fields collapse behind a single button.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${base}/admin/appointments`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  const inlineForm = main().locator('form').first()
  check('inline filters hidden on mobile', !(await inlineForm.isVisible()))

  const filterButton = main().getByRole('button', { name: 'جستجو و فیلتر' })
  check('filter button shown on mobile', await filterButton.isVisible())
  await filterButton.click()
  await page.waitForTimeout(600)
  check(
    'filter modal opens on mobile',
    (await page.locator('dialog[open] #appointment-search').count()) > 0
  )
  await page.screenshot({ path: `${out}/admin-mobile-filters.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

  await page.screenshot({ path: `${out}/admin-mobile-appointments.png`, fullPage: true })

  // 7g-ii. A row's overflow menu has to be fully visible even when the row sits
  // at the bottom of the screen — the card used to clip it, and it opened
  // downward off the fold, so the tap looked like it had done nothing.
  const bottomRow = main()
    .locator('li')
    .filter({ has: page.getByRole('button', { name: 'حذف', exact: true }) })
    .last()
  await bottomRow.evaluate((el) =>
    window.scrollBy(
      0,
      el.getBoundingClientRect().top - (innerHeight - el.offsetHeight - 20)
    )
  )
  await page.waitForTimeout(400)
  await bottomRow.getByRole('button', { name: 'گزینه‌های بیشتر' }).click()
  await page.waitForTimeout(500)

  const menuBox = await page.evaluate(() => {
    const menu = document.querySelector('[role="menu"]')
    if (!menu) return { onScreen: false, blocked: ['no menu'] }
    const box = menu.getBoundingClientRect()
    const blocked = [...menu.querySelectorAll('button')]
      .filter((el) => el.getBoundingClientRect().width > 0)
      .filter((el) => {
        const b = el.getBoundingClientRect()
        return !el.contains(
          document.elementFromPoint((b.left + b.right) / 2, (b.top + b.bottom) / 2)
        )
      })
      .map((el) => el.textContent.trim())
    return {
      onScreen:
        box.top >= 0 &&
        box.bottom <= innerHeight &&
        box.left >= 0 &&
        box.right <= innerWidth,
      blocked,
    }
  })
  check(
    'a bottom row opens its menu fully on screen',
    menuBox.onScreen && menuBox.blocked.length === 0,
    menuBox.blocked.length
      ? `blocked: ${menuBox.blocked.join(', ')}`
      : 'all entries reachable'
  )
  await page.screenshot({ path: `${out}/admin-mobile-row-menu.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // 7h. The mobile menu overlays the page instead of pushing it down. As an
  // in-flow block it moved everything, so the scroll position landed in the
  // middle of the menu and the first entries were above the viewport.
  await page.evaluate(() => window.scrollTo(0, 900))
  await page.waitForTimeout(400)
  const scrollBefore = await page.evaluate(() => window.scrollY)

  await page.getByRole('button', { name: 'باز کردن منو' }).click()
  await page.waitForTimeout(700)
  check(
    'opening the admin menu does not move the page',
    (await page.evaluate(() => window.scrollY)) === scrollBefore,
    `${scrollBefore} → ${await page.evaluate(() => window.scrollY)}`
  )

  const firstEntry = await page.getByRole('link', { name: 'داشبورد' }).evaluate((el) => {
    const box = el.getBoundingClientRect()
    return {
      top: Math.round(box.top),
      visible: box.top >= 0 && box.bottom <= innerHeight,
    }
  })
  check(
    'the whole menu is on screen, starting at the top',
    firstEntry.visible,
    `first entry at ${firstEntry.top}px`
  )
  const entries = await page.locator('#admin-menu a, #admin-menu button').count()
  // adminNav (10) plus "view site" and "sign out". Bump this when the nav
  // grows; it is here to catch the menu being clipped, not police its length.
  check('every menu entry is reachable', entries === 12, `${entries} entries`)
  await page.screenshot({ path: `${out}/admin-mobile-menu.png` })

  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  check(
    'closing it leaves the page where it was',
    (await page.evaluate(() => window.scrollY)) === scrollBefore
  )

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.setViewportSize({ width: 1280, height: 1000 })

  // 8. Public booking page — now a wizard: one question per screen.
  const pub = await browser.newPage({ viewport: { width: 1280, height: 1100 } })
  await pub.goto(`${base}/booking`, { waitUntil: 'networkidle' })
  await pub.waitForTimeout(2500)

  /** Advance a step and wait for the next panel to mount. */
  const advance = async (wait = 1800) => {
    await pub.getByRole('button', { name: /^(ادامه|بررسی و تأیید)$/ }).click()
    await pub.waitForTimeout(wait)
  }

  check(
    'the wizard starts on the service step alone',
    (await pub.getByText('نوع مشاوره را انتخاب کنید').count()) > 0 &&
      (await pub.getByText('تاریخ و زمان را انتخاب کنید').count()) === 0
  )
  check(
    'it cannot advance before a service is chosen',
    await pub.getByRole('button', { name: 'ادامه' }).isDisabled()
  )
  check(
    'and it says what is missing rather than just greying out',
    (await pub.getByText('ابتدا نوع مشاوره را انتخاب کنید.').count()) > 0
  )

  // 8b. Hypnotherapy is one hour but still needs the referral, and the
  //     duration choice now belongs to couple therapy.
  await pub.getByRole('radio', { name: /هیپنوتراپی/ }).click()
  await pub.waitForTimeout(600)
  check(
    'hypnotherapy shows the referral alert',
    (await pub.getByText('نیازمند تشخیص پزشک').count()) > 0
  )
  check(
    'hypnotherapy no longer asks for a duration',
    (await pub.getByRole('radio', { name: /۱ ساعت و ۳۰ دقیقه/ }).count()) === 0
  )

  await pub.getByRole('radio', { name: /مشاوره روابط و خانواده/ }).click()
  await pub.waitForTimeout(600)
  check(
    'couple therapy asks for a duration',
    (await pub.getByRole('radio', { name: /۱ ساعت و ۳۰ دقیقه/ }).count()) > 0 &&
      (await pub.getByRole('radio', { name: /^۲ ساعت$/ }).count()) > 0
  )
  check(
    'a multi-length service blocks the step until a length is picked',
    await pub.getByRole('button', { name: 'ادامه' }).isDisabled()
  )

  // Back to the single-hour service for the rest of the flow.
  await pub.getByRole('radio', { name: /مشاوره فردی/ }).click()
  await pub.waitForTimeout(600)
  await advance(2500)

  const slotButton = pub.locator('button').filter({ hasText: /^[۰-۹]{2}:[۰-۹]{2}$/ })
  const slots = await slotButton.count()
  check('the date step offers generated slots', slots > 0, `${slots} slot(s)`)
  check('slot times use persian digits', slots > 0)

  // 8c. Multiple hours on the same day.
  const free = pub
    .locator('button:not([disabled])')
    .filter({ hasText: /^[۰-۹]{2}:[۰-۹]{2}$/ })

  const atMinute = (label) => {
    const [h, m] = faToEn(label).split(':')
    return Number(h) * 60 + Number(m)
  }
  /** Index of the second free slot after checking every start is on the hour. */
  const wholeHourPair = (list) =>
    list.length >= 3 && list.every((label) => atMinute(label) % 60 === 0) ? 1 : -1

  // Every run books real hours, so a fixed date fills up over time. Search
  // forward for a day that still has room for two whole-hour sessions
  // rather than assuming one, walking each month from its last day back.
  let labels = []
  let adjacent = -1
  for (let month = 0; month < 3 && adjacent < 1; month += 1) {
    await pub.getByRole('button', { name: 'ماه بعد' }).click()
    await pub.waitForTimeout(900)
    const days = pub.locator('button:not([disabled])').filter({ hasText: /^[۰-۹]{1,2}$/ })
    for (let i = (await days.count()) - 1; i >= 0; i -= 1) {
      await days.nth(i).click()
      await pub.waitForTimeout(1500)
      labels = (await free.allInnerTexts()).sort((a, b) => atMinute(a) - atMinute(b))
      adjacent = wholeHourPair(labels)
      if (adjacent >= 1) break
    }
  }

  const freeCount = labels.length
  check('a future day has free hours', freeCount >= 3, `${freeCount} free`)
  const slotAt = (label) => pub.getByRole('button', { name: label, exact: true })

  // The public calendar must offer whole-hour starts only.
  check(
    'offered hours are whole hours',
    labels.every((label) => atMinute(label) % 60 === 0)
  )
  if (adjacent < 1) throw new Error('no day with three free whole-hour slots was found')

  await slotAt(labels[adjacent - 1]).click()
  await pub.waitForTimeout(500)
  check(
    'picking an hour leaves the next whole hour available',
    !(await slotAt(labels[adjacent]).isDisabled()),
    `${labels[adjacent - 1]} then ${labels[adjacent]}`
  )

  // A second whole-hour slot is still allowed.
  const separate = labels.findLast(
    (label) => atMinute(label) - atMinute(labels[adjacent - 1]) >= 60
  )
  await slotAt(separate).click()
  await pub.waitForTimeout(800)
  check(
    'two hours selected on one day',
    (await pub.getByText('۲ نوبت در این روز').count()) > 0
  )
  await pub.screenshot({ path: `${out}/booking-live.png`, fullPage: true })
  await advance(900)

  // 8d. Details, then the payment step — which shows no prices at all.
  await pub.fill('#booking-name', visitor)
  // The country picker defaults to Iran, and the trunk zero is dropped as it
  // is typed — what gets stored is E.164.
  check(
    'the phone field defaults to Iran',
    (await pub.getByRole('button', { name: 'کد کشور' }).innerText()).includes('+98')
  )

  await pub.fill('#booking-phone', '0912 000-0005')
  const phoneValue = await pub.locator('#booking-phone').inputValue()
  check(
    'the trunk zero and separators are stripped',
    phoneValue === '9120000005',
    phoneValue
  )

  // Too short for Iran: the step must not advance.
  await pub.fill('#booking-phone', '912345')
  await pub.waitForTimeout(400)
  check(
    'a number that is too short blocks the step',
    await pub.getByRole('button', { name: 'ادامه' }).isDisabled()
  )
  await pub.fill('#booking-phone', '9120000005')
  await pub.waitForTimeout(400)

  // The picker searches by Persian name, English name, ISO code or dial code.
  await pub.getByRole('button', { name: 'کد کشور' }).click()
  await pub.waitForTimeout(400)
  await pub.getByPlaceholder('جست‌وجوی کشور یا کد').fill('سوئیس')
  await pub.waitForTimeout(400)
  const swiss = pub.getByRole('button', { name: /سوئیس/ })
  check('the country search finds a country by name', (await swiss.count()) === 1)
  await swiss.click()
  await pub.waitForTimeout(400)
  check(
    'choosing a country switches the dial code',
    (await pub.getByRole('button', { name: 'کد کشور' }).innerText()).includes('+41')
  )
  // Swiss numbers are nine digits, so the ten-digit Iranian mobile no longer
  // fits — the rules really are per country, not one length for everyone.
  check(
    'a number that does not fit the chosen country is rejected',
    await pub.getByRole('button', { name: 'ادامه' }).isDisabled()
  )

  // Back to Iran for the rest of the flow.
  await pub.getByRole('button', { name: 'کد کشور' }).click()
  await pub.waitForTimeout(400)
  await pub.getByPlaceholder('جست‌وجوی کشور یا کد').fill('98')
  await pub.waitForTimeout(400)
  await pub.getByRole('button', { name: /ایران/ }).first().click()
  await pub.waitForTimeout(400)
  check(
    'a valid Iranian number unblocks the step',
    await pub.getByRole('button', { name: 'ادامه' }).isEnabled()
  )

  // Advancing replaces the panel in place, so the visitor would otherwise be
  // left looking at wherever the last step happened to end.
  await pub.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await pub.waitForTimeout(400)
  const scrolledDown = await pub.evaluate(() => Math.round(window.scrollY))
  await pub.fill('#booking-email', 'test@example.com')
  await advance(1600)

  const scrolledAfter = await pub.evaluate(() => Math.round(window.scrollY))
  check(
    'advancing scrolls back to the top of the form',
    scrolledAfter < scrolledDown,
    `${scrolledDown} → ${scrolledAfter}`
  )

  check(
    'the payment step asks for the region first',
    (await pub.getByText('محل اقامت خود را انتخاب کنید').count()) > 0
  )
  // An amount, not the word — «پرداخت با تتر یا کارت به کارت» is a label.
  const amountsOnPaymentStep = await pub
    .getByText(/[۰-۹][۰-۹٬٫]*\s*(تومان|تتر)/)
    .allInnerTexts()
  check(
    'no prices are shown while choosing how to pay',
    amountsOnPaymentStep.length === 0,
    amountsOnPaymentStep.join(' | ')
  )

  await pub.getByRole('radio', { name: /داخل ایران/ }).click()
  await pub.waitForTimeout(700)
  check(
    'inside Iran needs no second choice',
    await pub.getByRole('button', { name: 'بررسی و تأیید' }).isEnabled()
  )
  await advance(2000)

  check(
    'review step appears before writing',
    (await pub.getByText('اطلاعات رزرو را تأیید کنید').count()) > 0
  )
  check(
    'the review shows the region and the rail',
    (await pub.getByText('داخل ایران', { exact: true }).count()) > 0 &&
      (await pub.getByText('کارت به کارت', { exact: true }).count()) > 0
  )
  check(
    'the total is quoted at the domestic tariff',
    (await pub.getByText('۵٬۰۰۰٬۰۰۰ تومان').count()) > 0
  )

  await pub.fill('#discount-code', 'E2ETEST20')
  await pub.getByRole('button', { name: 'اعمال' }).click()
  await pub.waitForTimeout(2000)
  check(
    'discount applies and recalculates',
    (await pub.getByText('کد تخفیف اعمال شد').count()) > 0 &&
      (await pub.getByText('۴٬۰۰۰٬۰۰۰ تومان').count()) > 0
  )
  check(
    'review can go back to edit',
    (await pub.getByRole('button', { name: 'ویرایش اطلاعات' }).count()) > 0
  )
  await pub.screenshot({ path: `${out}/booking-review.png`, fullPage: true })

  // Going back must not throw the chosen day and hours away. The picker
  // remounts here, and its "soonest free day" suggestion used to overwrite
  // them, so the visitor had to pick the whole thing again.
  await pub.getByRole('button', { name: 'ویرایش اطلاعات' }).click()
  await pub.waitForTimeout(1200)
  await pub.getByRole('button', { name: /بازگشت به «انتخاب تاریخ و زمان»/ }).click()
  await pub.waitForTimeout(2000)
  check(
    'going back keeps the chosen hours',
    (await pub.getByText('۲ نوبت در این روز').count()) > 0
  )
  await advance(900)
  await advance(900)
  await advance(2000)

  await pub.getByRole('button', { name: 'ادامه پرداخت' }).click()
  await pub.waitForURL(/\/booking\/[0-9a-f-]{36}\/pay/, { timeout: 20000 })
  check(
    'lands on the payment page',
    /\/pay$/.test(new URL(pub.url()).pathname),
    pub.url()
  )
  // Grouped in fours on the card face; the copy button still yields the raw value.
  check('card number is shown', (await pub.getByText('6037 9979 1234 5678').count()) > 0)
  check(
    'sheba is shown',
    (await pub.getByText('IR82 0540 1026 8002 0817 9090 02').count()) > 0
  )
  check('the holder name is on the card', (await pub.getByText('زهره اژدری').count()) > 0)
  check(
    'paid button is offered',
    (await pub.getByRole('button', { name: 'پرداخت کردم' }).count()) > 0
  )
  await pub.screenshot({ path: `${out}/booking-pay.png`, fullPage: true })

  // 8e. Receipt upload puts the booking into "awaiting payment review".
  await pub.getByRole('button', { name: 'پرداخت کردم' }).click()
  await pub.waitForTimeout(600)

  check(
    'the uploader starts as a dropzone',
    (await pub.getByText('فایل رسید را اینجا رها کنید').count()) > 0
  )
  check(
    'sending is disabled until a file is chosen',
    await pub.getByRole('button', { name: 'ارسال رسید' }).isDisabled()
  )

  // Too big is refused in the browser, before a single byte is sent.
  await pub.setInputFiles('#receipt', {
    name: 'huge.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(6 * 1024 * 1024),
  })
  await pub.waitForTimeout(500)
  check(
    'an oversized file is refused before uploading',
    (await pub.getByText('حجم فایل نباید بیشتر از ۵ مگابایت باشد').count()) > 0 &&
      (await pub.getByRole('button', { name: 'ارسال رسید' }).isDisabled())
  )

  await pub.setInputFiles('#receipt', {
    name: 'receipt.png',
    mimeType: 'image/png',
    // 1×1 PNG.
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    ),
  })
  await pub.waitForTimeout(600)
  check(
    'the chosen image is previewed with its name',
    (await pub.locator('img[src^="blob:"]').count()) > 0 &&
      (await pub.getByText('receipt.png').count()) > 0
  )
  await pub.screenshot({ path: `${out}/booking-receipt.png`, fullPage: true })

  await pub.getByRole('button', { name: 'ارسال رسید' }).click()
  await pub.waitForTimeout(3000)
  // The upload revalidates the page, which then renders the awaiting-review
  // banner in place of the form — that banner is the success signal.
  check(
    'receipt accepted and booking awaits review',
    (await pub.getByText('در انتظار تأیید پرداخت').count()) > 0
  )

  // 8f. The admin sees it awaiting review and can confirm it.
  await page.goto(`${base}/admin/appointments`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const pendingRow = main().locator('li').filter({ hasText: visitor }).first()
  check('admin sees the pending payment', (await pendingRow.count()) > 0)

  // Waiting receipts get their own section at the top, outside the filters.
  const awaitingBox = main()
    .locator('section')
    .filter({ hasText: 'رسیدهای در انتظار بررسی' })
  check(
    'unreviewed receipts are listed separately at the top',
    (await awaitingBox.count()) > 0 &&
      (await awaitingBox.locator('li').filter({ hasText: visitor }).count()) > 0
  )
  await page.screenshot({ path: `${out}/admin-awaiting.png`, fullPage: true })

  const openReceipt = async () => {
    await main()
      .locator('li')
      .filter({ hasText: visitor })
      .first()
      .getByRole('button', { name: 'مشاهده رسید' })
      .click()
    await page.waitForTimeout(900)
    return page.locator('dialog[open]')
  }

  // The receipt opens in a modal, and the payment decision is made there —
  // looking at the receipt is the confirmation step.
  let receiptDialog = await openReceipt()
  check(
    'the receipt opens in a modal',
    (await receiptDialog.locator('img[alt*="رسید"]').count()) > 0
  )
  check(
    'the modal offers the payment decision',
    (await receiptDialog.getByRole('button', { name: 'تأیید پرداخت' }).count()) > 0 &&
      (await receiptDialog.getByRole('button', { name: 'رد رسید' }).count()) > 0
  )

  // 8g. Refusing a receipt cancels the booking, and is reversible.
  await receiptDialog.getByRole('button', { name: 'رد رسید' }).click()
  await page.waitForTimeout(2500)
  const rejectedRow = main().locator('li').filter({ hasText: visitor }).first()
  const rejectedText = await rejectedRow.innerText()
  check('refusing a receipt cancels the booking', rejectedText.includes('لغو شده'))
  check(
    'the refused booking is no longer awaiting anything',
    !rejectedText.includes('در انتظار') && rejectedText.includes('پرداخت‌نشده'),
    rejectedText.replace(/\s+/g, ' ').slice(0, 70)
  )
  const stillWaiting = await main()
    .locator('section')
    .filter({ hasText: 'رسیدهای در انتظار بررسی' })
    .allInnerTexts()
  check(
    'a rejected receipt leaves the waiting list',
    !stillWaiting.join(' ').includes(visitor),
    stillWaiting.length ? stillWaiting[0].replace(/\s+/g, ' ').slice(0, 80) : 'empty'
  )

  // The decision can still be changed, and confirming reinstates the booking
  // that the refusal cancelled.
  receiptDialog = await openReceipt()
  check(
    'the decision can be revisited after a rejection',
    (await receiptDialog.getByRole('button', { name: 'تأیید پرداخت' }).count()) > 0
  )
  await receiptDialog.getByRole('button', { name: 'تأیید پرداخت' }).click()
  await page.waitForTimeout(2500)
  check(
    'confirming closes the receipt modal',
    (await page.locator('dialog[open]').count()) === 0
  )
  check(
    'confirming payment confirms the booking',
    (
      await main().locator('li').filter({ hasText: visitor }).first().innerText()
    ).includes('رزرو شده')
  )

  // 8h. The abroad rails. A client outside Iran can pay in tether *or* by card
  // to the same Iranian account at a different toman tariff — and the payment
  // page picks its panel from the rail, not from the region. Get that wrong and
  // a card payer is shown a wallet address next to a toman amount.
  const bookAbroad = async ({ phone, methodName, expected, wantsCard }) => {
    const away = await browser.newPage({ viewport: { width: 1280, height: 1100 } })
    try {
      await away.goto(`${base}/booking`, { waitUntil: 'networkidle' })
      await away.waitForTimeout(2500)
      const step = async (wait = 1200) => {
        await away.getByRole('button', { name: /^(ادامه|بررسی و تأیید)$/ }).click()
        await away.waitForTimeout(wait)
      }

      await away.getByRole('radio', { name: /مشاوره فردی/ }).click()
      await away.waitForTimeout(500)
      await step(2500)

      const hour = away
        .locator('button:not([disabled])')
        .filter({ hasText: /^[۰-۹]{2}:[۰-۹]{2}$/ })
        .first()
      if ((await hour.count()) === 0) return check(`${methodName}: a free hour`, false)
      await hour.click()
      await away.waitForTimeout(600)
      await step()

      await away.fill('#booking-name', `${visitor} ${methodName}`)
      await away.fill('#booking-phone', phone.replace(/^0/, ''))
      await step()

      await away.getByRole('radio', { name: /خارج از ایران/ }).click()
      await away.waitForTimeout(700)
      check(
        `${methodName}: abroad offers both rails`,
        (await away.getByRole('radio', { name: /تتر/ }).count()) > 0 &&
          (await away.getByRole('radio', { name: /کارت به کارت/ }).count()) > 0
      )
      await away.getByRole('radio', { name: methodName }).click()
      await away.waitForTimeout(500)
      await step(2000)

      check(
        `${methodName}: quoted at the abroad tariff`,
        (await away.getByText(expected).count()) > 0,
        expected
      )

      await away.getByRole('button', { name: 'ادامه پرداخت' }).click()
      await away.waitForURL(/\/booking\/[0-9a-f-]{36}\/pay/, { timeout: 20000 })
      await away.waitForTimeout(800)

      const showsCard = (await away.getByText('6037 9979 1234 5678').count()) > 0
      const showsWallet =
        (await away.getByText('TXk8rQSAvPvBBM2yTgTfstDdFsPbc4Dbo3').count()) > 0
      check(
        `${methodName}: the payment page shows the right instructions`,
        showsCard === wantsCard && showsWallet === !wantsCard,
        `card=${showsCard} wallet=${showsWallet}`
      )
      check(
        `${methodName}: the payable amount carries over`,
        (await away.getByText(expected).count()) > 0
      )
      await away.screenshot({
        path: `${out}/booking-pay-${wantsCard ? 'abroad-card' : 'usdt'}.png`,
        fullPage: true,
      })
    } finally {
      await away.close()
    }
  }

  await bookAbroad({
    phone: '09120000002',
    methodName: 'کارت به کارت (تومان)',
    expected: '۳٬۰۰۰٬۰۰۰ تومان',
    wantsCard: true,
  })
  await bookAbroad({
    phone: '09120000003',
    methodName: 'پرداخت با تتر (USDT)',
    expected: '۳۵ تتر',
    wantsCard: false,
  })

  // 9. The fixed header must not swallow taps meant for the page beneath it.
  // Its box covers its own padding and the collapsed mobile drawer, which is
  // hundreds of pixels of invisible area over the top of the content.
  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  await phone.goto(`${base}/booking`, { waitUntil: 'networkidle' })
  await phone.waitForTimeout(2000)

  const headerHit = await phone.evaluate(() => {
    const header = document.querySelector('header')
    if (!header) return { error: 'no header' }
    // The desktop CTA also carries pointer-events-auto but is display:none
    // here, so take the one that is actually laid out.
    const pill = [...header.querySelectorAll('.pointer-events-auto')].find(
      (el) => el.getBoundingClientRect().height > 0
    )
    const pillBottom = pill.getBoundingClientRect().bottom
    const headerBottom = header.getBoundingClientRect().bottom
    // A point inside the header's box but below anything visible in it.
    const y = (pillBottom + headerBottom) / 2
    const hit = document.elementFromPoint(window.innerWidth / 2, y)
    return {
      deadZone: Math.round(headerBottom - pillBottom),
      swallowed: hit === header || (hit !== null && header.contains(hit)),
    }
  })
  check(
    'the header does not swallow taps below the nav pill',
    headerHit.swallowed === false,
    `${headerHit.deadZone}px of header sits below the pill`
  )

  // And end to end: a card scrolled to just under the pill must still take a tap.
  const firstService = phone.getByRole('radio', { name: /مشاوره فردی/ })
  const placed = await firstService.evaluate((el) => {
    const header = document.querySelector('header')
    const pill = [...header.querySelectorAll('.pointer-events-auto')].find(
      (node) => node.getBoundingClientRect().height > 0
    )
    // Just clear of the visible pill, but well inside the header's own box.
    const clearance = pill.getBoundingClientRect().bottom + 12
    const card = el.closest('label') ?? el
    window.scrollBy(0, card.getBoundingClientRect().top - clearance)
    const box = card.getBoundingClientRect()
    return {
      top: Math.round(box.top),
      clearsPill: box.top >= pill.getBoundingClientRect().bottom,
      inDeadZone: box.bottom < header.getBoundingClientRect().bottom,
    }
  })
  // Without this the tap test could pass simply by never reaching the danger
  // area — or by sitting behind the pill, where interception is correct.
  check(
    'the card really sits in the invisible part of the header',
    placed.clearsPill && placed.inDeadZone,
    `${placed.top}px from the top`
  )

  await phone.waitForTimeout(500)
  try {
    await firstService.click({ timeout: 5000 })
    check('a card just under the header is tappable', await firstService.isChecked())
  } catch (error) {
    check('a card just under the header is tappable', false, error.message.split('\n')[0])
  }
  await phone.screenshot({ path: `${out}/mobile-booking-top.png` })
  await phone.close()
} catch (error) {
  check('run completed without exception', false, error.message.split('\n')[0])
}

const failed = steps.filter((s) => !s.ok).length
console.log(
  failed === 0 ? `\nAll ${steps.length} checks passed.` : `\n${failed} check(s) failed.`
)

await browser.close()
process.exit(failed === 0 ? 0 : 1)
