/**
 * End-to-end test of downloadable articles.
 *
 *   node scripts/e2e-articles.mjs [baseUrl] [username] [password]
 *
 * Uploads a paper through the panel, checks it reaches the public list and
 * downloads byte-for-byte, then hides it, edits it and deletes it —
 * confirming the PDF leaves the disk along with the row.
 *
 * Seeds and sweeps its own rows, so DATABASE_URL is required.
 */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
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

/** Marks every row this run creates, so the sweep cannot overreach. */
const MARK = `مقاله آزمایشی ${Date.now().toString().slice(-6)}`

let pass = 0
let fail = 0
const check = (label, ok, extra = '') => {
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`)
}

const sweep = () =>
  pool.query('delete from article where title like $1', ['مقاله آزمایشی %'])
await sweep()

/** A small but structurally real PDF, so nothing rejects it as malformed. */
const PDF = Buffer.from(
  [
    '%PDF-1.4',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj',
    'trailer<</Root 1 0 R>>',
    '%%' + 'EOF',
    '',
  ].join('\n'),
  'utf8'
)

/** A 2x4 portrait PNG — enough to prove the pipeline, tiny to move around. */
const COVER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAAECAYAAACk7+45AAAAF0lEQVR4nGP8//8/AzbAhFVkNEik' +
    'AAAAAP//AwAOhwHfLQoTsQAAAABJRU5ErkJggg==',
  'base64'
)

const browser = await chromium.launch()
const admin = await browser.newPage()
await admin.goto(`${base}/admin/login`, { waitUntil: 'domcontentloaded' })
await admin.locator('input[name=username]').fill(username)
await admin.locator('input[name=password]').fill(password)
await admin.locator('button[type=submit]').click()
await admin.waitForURL(/\/admin(\?|$)/, { timeout: 20000 })

/* ------------------------------------------------------------- upload */

await admin.goto(`${base}/admin/articles`, { waitUntil: 'domcontentloaded' })

// Refusing a non-PDF is the rule, not a suggestion.
await admin.locator('#title-new').fill(`${MARK} بد`)
await admin.locator('#file-new').setInputFiles({
  name: 'note.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('nope'),
})
await admin.getByRole('button', { name: 'افزودن مقاله' }).click()
await admin.waitForTimeout(2500)
check(
  'a non-PDF is refused',
  ((await admin.locator('body').textContent()) ?? '').includes('فقط فایل PDF')
)
check(
  'and nothing was stored',
  (
    await pool.query('select count(*)::int n from article where title like $1', [
      `${MARK}%`,
    ])
  ).rows[0].n === 0
)

await admin.locator('#title-new').fill(MARK)
await admin.locator('#description-new').fill('توضیح کوتاه آزمایشی برای بررسی خودکار.')
await admin
  .locator('#file-new')
  .setInputFiles({ name: 'paper.pdf', mimeType: 'application/pdf', buffer: PDF })
await admin
  .locator('#cover-new')
  .setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: COVER })
await admin.getByRole('button', { name: 'افزودن مقاله' }).click()
await admin.getByText('مقاله منتشر شد.').waitFor({ timeout: 20000 })

const stored = (
  await pool.query(
    `select id, file_name, file_size, language, page_count, cover_name, published
       from article where title = $1`,
    [MARK]
  )
).rows[0]
check('the article is stored', Boolean(stored), JSON.stringify(stored ?? null))
check('it is published by default', stored?.published === true)
check(
  'the PDF is written to disk',
  existsSync(`data/articles/${stored.file_name}`),
  stored?.file_name
)
check('the language defaults to Persian', stored?.language === 'fa', stored?.language)
check('the cover is stored', Boolean(stored?.cover_name), stored?.cover_name ?? 'none')
check(
  'the cover file is written to disk',
  Boolean(stored?.cover_name) && existsSync(`data/articles/${stored.cover_name}`)
)
check(
  'the page count is read from the PDF',
  stored?.page_count === 1,
  String(stored?.page_count)
)

/* ------------------------------------------------------------- public */

const visitor = await browser.newPage()
await visitor.goto(`${base}/articles`, { waitUntil: 'networkidle' })
const listed = (await visitor.locator('main').textContent()) ?? ''
check('it appears on the public list', listed.includes(MARK))
check('the description is shown', listed.includes('توضیح کوتاه آزمایشی'))
check('the language is shown', listed.includes('فارسی'))

// With a cover, the artwork carries the title — so it must not be repeated in
// visible text, but must still exist for screen readers and search.
const card = visitor.locator('main article', { hasText: 'توضیح کوتاه آزمایشی' }).first()
check(
  'the cover image is rendered',
  (await card.locator(`img[src="/api/articles/${stored.id}/cover"]`).count()) === 1
)
check(
  'the title is present but not shown, since the cover carries it',
  (await card.locator('h2.sr-only').textContent()) === MARK,
  (await card.locator('h2.sr-only').textContent()) ?? ''
)

const cover = await visitor.request.get(`${base}/api/articles/${stored.id}/cover`)
check(
  'the cover serves as an image',
  cover.headers()['content-type'] === 'image/png',
  cover.headers()['content-type'] ?? ''
)
check('the page count is shown', listed.includes('۱ صفحه'))
check('a reading estimate is shown', listed.includes('دقیقه مطالعه'))

// The meta line used to be one text node, and the browser reordered the Latin
// «PDF» into the middle of the Persian. Read back in visual order it must not.
const meta = await visitor
  .locator('main article')
  .first()
  .locator('div > div')
  .evaluate((el) =>
    [...el.children]
      .map((c) => c.textContent.trim())
      .filter(Boolean)
      .join('|')
  )
check(
  'the meta line reads in order, with PDF where it was written',
  meta.startsWith('فارسی|·|PDF|·'),
  meta
)

const download = await visitor.request.get(`${base}/api/articles/${stored.id}`)
check(
  'the download serves a PDF',
  download.headers()['content-type'] === 'application/pdf',
  download.headers()['content-type'] ?? ''
)
const body = await download.body()
check(
  'byte-for-byte what was uploaded',
  Buffer.from(body).equals(PDF),
  `${body.length} of ${PDF.length} bytes`
)
check(
  'it downloads rather than opening in place',
  (download.headers()['content-disposition'] ?? '').startsWith('attachment'),
  download.headers()['content-disposition'] ?? ''
)

/* ------------------------------------------------------- remove cover */

await admin.goto(`${base}/admin/articles`, { waitUntil: 'domcontentloaded' })
const coverRow = admin.locator('li', { hasText: MARK }).first()
await coverRow.getByRole('button', { name: 'گزینه‌های بیشتر' }).click()
const removeCover = coverRow.getByRole('button', { name: 'حذف تصویر جلد' })
await removeCover.waitFor({ timeout: 10000 })
await removeCover.click()
await admin.getByRole('button', { name: 'حذف کن' }).click()
await admin.waitForTimeout(2500)

check(
  'removing the cover clears it and deletes the file',
  (await pool.query('select cover_name from article where id = $1', [stored.id])).rows[0]
    ?.cover_name === null && !existsSync(`data/articles/${stored.cover_name}`)
)

/* -------------------------------------------------------------- hide */

await admin.goto(`${base}/admin/articles`, { waitUntil: 'domcontentloaded' })
const row = admin.locator('li', { hasText: MARK }).first()
await row.getByRole('button', { name: 'گزینه‌های بیشتر' }).click()
await row.getByRole('button', { name: 'پنهان کردن' }).click()
await admin.waitForTimeout(2500)

await visitor.goto(`${base}/articles`, { waitUntil: 'networkidle' })
check(
  'hiding takes it off the public list',
  !((await visitor.locator('main').textContent()) ?? '').includes(MARK)
)
const hidden = await visitor.request.get(`${base}/api/articles/${stored.id}`)
check(
  'and its file stops being downloadable',
  hidden.status() === 404,
  String(hidden.status())
)

/* -------------------------------------------------------------- edit */

await admin.goto(`${base}/admin/articles`, { waitUntil: 'domcontentloaded' })
await admin
  .locator('li', { hasText: MARK })
  .first()
  .getByRole('button', { name: 'ویرایش' })
  .click()
await admin.getByRole('heading', { name: 'ویرایش مقاله' }).waitFor({ timeout: 10000 })
await admin.locator(`#title-edit-${stored.id}`).fill(`${MARK} ویرایش‌شده`)
await admin.getByRole('button', { name: 'ذخیره تغییرات' }).click()
await admin.waitForTimeout(2500)

const edited = (await pool.query('select title from article where id = $1', [stored.id]))
  .rows[0]
check(
  'editing the title keeps the existing file',
  edited?.title === `${MARK} ویرایش‌شده` &&
    existsSync(`data/articles/${stored.file_name}`),
  edited?.title ?? ''
)

/* ------------------------------------------------------------ delete */

await admin.goto(`${base}/admin/articles`, { waitUntil: 'domcontentloaded' })
const target = admin.locator('li', { hasText: MARK }).first()
await target.getByRole('button', { name: 'گزینه‌های بیشتر' }).click()
await target.getByRole('button', { name: 'حذف' }).click()
await admin.getByRole('button', { name: 'حذف کن' }).click()
await admin.waitForTimeout(2500)

check(
  'deleting removes the row',
  (await pool.query('select count(*)::int n from article where id = $1', [stored.id]))
    .rows[0].n === 0
)
check(
  'and takes the PDF with it',
  !existsSync(`data/articles/${stored.file_name}`),
  stored.file_name
)

await browser.close()
const swept = await sweep()
console.log(`\nswept ${swept.rowCount} test row(s)`)
await pool.end()

console.log(`${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
