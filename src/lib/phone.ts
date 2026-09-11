import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min'

/**
 * Phone numbers, stored in E.164 (`+989123456789`).
 *
 * The rules for what counts as a valid number differ per country in ways no
 * hand-written regex survives — Iran's mobile numbers are 10 digits after the
 * `+98`, Germany's vary from 10 to 11, and plenty of countries have several
 * valid lengths. libphonenumber carries those rules, and the same check runs in
 * the browser and on the server so a number cannot pass one and fail the other.
 */

export const DEFAULT_COUNTRY: CountryCode = 'IR'

export type Country = {
  code: CountryCode
  /** Dial prefix without the plus. */
  dial: string
  /** Localised name, e.g. «ایران». */
  name: string
  /** Path to the flag under `public/`. */
  flag: string
}

const persianNames = new Intl.DisplayNames(['fa'], { type: 'region' })

/**
 * Where the CLDR name is not the name Persian speakers use.
 *
 * The unicode data is correct but formal, and in a couple of places simply not
 * what anyone says: «بریتانیا» for the UK, and «ایالات متحده» on its own,
 * which reads as an abbreviation. A few others carry an ezafe hamza that is
 * rarely typed («کرهٔ جنوبی»), or an initial alef without its madda.
 */
const PERSIAN_NAME_OVERRIDES: Record<string, string> = {
  US: 'ایالات متحده آمریکا',
  GB: 'انگلیس',
  AE: 'امارات متحده عربی',
  KR: 'کره جنوبی',
  ZA: 'آفریقای جنوبی',
  AZ: 'آذربایجان',
  CZ: 'جمهوری چک',
}
const latinNames = new Intl.DisplayNames(['en'], { type: 'region' })

/**
 * An image rather than the emoji flag.
 *
 * Emoji flags are regional-indicator pairs, and Windows ships no glyphs for
 * them: the picker rendered "IR", "DE" instead of flags for every desktop
 * visitor. See `npm run flags`.
 */
const flagOf = (code: string) => `/flags/${code.toLowerCase()}.svg`

/** Every dialable country, Iran first and the rest alphabetical in Persian. */
export const COUNTRIES: Country[] = (() => {
  const all = getCountries().map((code) => ({
    code,
    dial: getCountryCallingCode(code),
    name: PERSIAN_NAME_OVERRIDES[code] ?? persianNames.of(code) ?? code,
    flag: flagOf(code),
  }))

  const collator = new Intl.Collator('fa')
  all.sort((a, b) => collator.compare(a.name, b.name))

  const iran = all.filter((c) => c.code === DEFAULT_COUNTRY)
  return [...iran, ...all.filter((c) => c.code !== DEFAULT_COUNTRY)]
})()

/** Matches on Persian name, English name, ISO code or dial prefix. */
export function searchCountries(term: string): Country[] {
  const needle = term.trim().replace(/^\+/, '').toLowerCase()
  if (!needle) return COUNTRIES

  return COUNTRIES.filter((country) => {
    if (country.code.toLowerCase().startsWith(needle)) return true
    if (country.dial.startsWith(needle)) return true
    if (country.name.includes(term.trim())) return true
    return (latinNames.of(country.code) ?? '').toLowerCase().includes(needle)
  })
}

export function findCountry(code: string): Country | undefined {
  return COUNTRIES.find((country) => country.code === code)
}

/** `+98`, `9123456789` → `+989123456789`. Empty when there is no number yet. */
export function toE164(country: CountryCode, national: string): string {
  const digits = national.replace(/\D/g, '').replace(/^0+/, '')
  if (!digits) return ''
  return `+${getCountryCallingCode(country)}${digits}`
}

export function isValidPhone(e164: string): boolean {
  return e164.startsWith('+') && isValidPhoneNumber(e164)
}

/** Splits a stored number back into its parts, for re-editing. */
export function splitE164(
  e164: string
): { country: CountryCode; national: string } | null {
  const parsed = parsePhoneNumberFromString(e164)
  if (!parsed?.country) return null
  return { country: parsed.country, national: parsed.nationalNumber }
}

/** How a number is shown to a human: `+98 912 345 6789`. */
export function formatPhone(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164
}
