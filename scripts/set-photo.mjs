/**
 * Installs a real photo into public/images under the filename the site expects.
 *
 *   npm run photo -- hero    "C:\\Users\\me\\Downloads\\portrait.jpg"
 *   npm run photo -- booking "C:\\Users\\me\\Downloads\\calendar.jpg"
 *
 * Then: docker compose restart web   (public/images is bind-mounted, no rebuild)
 */
import { copyFile, stat, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const SLOTS = {
  hero: { file: 'hero-therapist.jpg', what: 'the doctor portrait (4:5 portrait)' },
  booking: { file: 'booking-calendar.jpg', what: 'the calendar photo (landscape)' },
}

const [slotName, sourcePath] = process.argv.slice(2)

function usage(message) {
  console.error(`\n${message}\n`)
  console.error('Usage:  npm run photo -- <slot> <path-to-image>\n')
  for (const [name, slot] of Object.entries(SLOTS)) {
    console.error(`  ${name.padEnd(8)} -> public/images/${slot.file}  (${slot.what})`)
  }
  console.error('')
  process.exit(1)
}

const slot = SLOTS[slotName]
if (!slot) usage(slotName ? `Unknown slot "${slotName}".` : 'Missing slot.')
if (!sourcePath) usage('Missing path to the image file.')

const source = resolve(sourcePath)

let info
try {
  info = await stat(source)
} catch {
  usage(`No file at: ${source}`)
}
if (!info.isFile()) usage(`Not a file: ${source}`)

// Sniff the magic bytes — a mis-saved HTML error page or .webp named .jpg is a
// confusing failure mode otherwise.
const head = (await readFile(source)).subarray(0, 12)
const isJpeg = head[0] === 0xff && head[1] === 0xd8
const isPng = head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
const isWebp =
  head.subarray(0, 4).toString('ascii') === 'RIFF' &&
  head.subarray(8, 12).toString('ascii') === 'WEBP'

if (!isJpeg && !isPng && !isWebp) {
  usage(`That file is not a JPEG/PNG/WebP image: ${source}`)
}
if (!isJpeg) {
  console.warn(
    `\n  Note: source is ${isPng ? 'PNG' : 'WebP'}, saving as .jpg.\n` +
      '  Browsers sniff content so it will still render, but re-saving as a real\n' +
      '  JPEG keeps things tidy.\n'
  )
}

const destination = resolve('public/images', slot.file)
await copyFile(source, destination)

const kb = Math.round(info.size / 1024)
console.log(`\n  Installed ${slot.file}  (${kb} KB)`)
if (kb > 400) {
  console.log(`  Heads up: ${kb} KB is large — consider compressing via squoosh.app`)
}
console.log('\n  Now run:  docker compose restart web\n')
