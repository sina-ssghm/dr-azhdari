import localFont from 'next/font/local'

/**
 * Vazirmatn v33.003 — variable weight axis (100–900), self-hosted.
 *
 * Deliberately NOT loaded from Google Fonts: Google's font CDN is unreliable
 * (and frequently unreachable) from inside Iran, which is where most visitors
 * will be. Self-hosting keeps first paint fast and the site independent of any
 * blocked third party.
 */
export const vazirmatn = localFont({
  src: '../fonts/Vazirmatn-Variable.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-vazirmatn',
  preload: true,
  fallback: ['Tahoma', 'Segoe UI', 'system-ui', 'sans-serif'],
})
