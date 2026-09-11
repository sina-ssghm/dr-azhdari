/**
 * Copies country flag SVGs into `public/flags/`.
 *
 *   npm run flags
 *
 * They are committed rather than generated at build time so the Docker image
 * needs no extra step, and served as files rather than emoji: emoji flags
 * render as two letters on Windows, which is where the picker looked broken.
 *
 * `country-flag-icons` is a dev dependency — nothing imports it at runtime.
 */
import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const from = 'node_modules/country-flag-icons/3x2'
const to = 'public/flags'

await rm(to, { recursive: true, force: true })
await mkdir(to, { recursive: true })

const files = (await readdir(from)).filter((name) => name.endsWith('.svg'))
for (const name of files) {
  // Lowercase so the component can build the path straight from an ISO code.
  await cp(join(from, name), join(to, name.toLowerCase()))
}

console.log(`copied ${files.length} flags into ${to}`)
