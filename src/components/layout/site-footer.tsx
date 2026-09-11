import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  InstagramIcon,
  LeafIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  WhatsappIcon,
} from '@/components/icons'
import { Container } from '@/components/ui/container'
import { footer, services, site } from '@/content/site'
import { toPersianDigits } from '@/lib/utils'
import { getContactDetails } from '@/server/settings'

/*
  Contrast on this band is computed against olive-900 #38442c, not eyeballed.
  The hypnotherapy band already established the two findings that matter and
  they are reused rather than rediscovered: nothing green in the palette
  clears 3:1 on this ground (olive-400 is the lightest, at 2.79), and
  olive-200 at 6.48 is the lightest green that does — so it draws icons and
  edges, never text.

  The second finding is the trap. globals.css draws :focus-visible in
  olive-600, which lands at 1.78 here: a focus ring nobody can see. Every
  focusable element below overrides it to cream at 9.49. If a link is added to
  this file later without `ring`, it becomes an accessibility regression that
  no visual diff will catch.
*/
const ring = 'focus-visible:outline-sand-100'

/* `py-2.5` is not spacing. On this line height it is what turns a 13px text
   link into a 44px tap target, full column width on a phone. */
const columnLink = `text-sand-400 hover:text-sand-50 block rounded-lg py-2.5 text-[0.8125rem] leading-[1.9] transition-colors duration-300 ${ring}`

const heading = 'text-sand-50 text-[0.9375rem] leading-tight font-semibold'

/** The rule under each column heading. Decorative, but 6.48 keeps it crisp. */
const headingRule = 'mt-3 block h-px w-6 bg-olive-200'

/*
  A filled disc is invisible on this ground — olive-700 is 1.50 against
  olive-900 — so the badge's edge is drawn rather than implied, exactly as the
  hypnotherapy band draws its button. The olive-200 hairline is 6.48 against
  the band, and a sand-100 glyph is 6.34 against the fill.
*/
const badge = 'grid place-items-center rounded-full bg-olive-700 ring-1 ring-olive-200'

const socialLink = `${badge} ${ring} text-sand-100 hover:bg-olive-600 hover:text-sand-50 hover:ring-sand-100 size-11 shrink-0 transition-colors duration-300`

const contactRow =
  'flex items-start gap-3 rounded-lg py-2.5 text-[0.8125rem] leading-[1.9]'

/**
 * One line of the contact column: a quiet caption over a bright value.
 *
 * The phones and the email are links across the whole row rather than on the
 * value alone — a 13px phone number is not a tap target, and the caption is
 * part of what the row means, so it belongs inside the accessible name.
 */
function ContactRow({
  icon,
  href,
  caption,
  children,
}: {
  icon: ReactNode
  href?: string
  caption?: string
  children: ReactNode
}) {
  const body = (
    <>
      {/* Nudged down a line rather than centred: centring would float the pin
          against the middle of a three-line address. */}
      <span aria-hidden="true" className="mt-1 shrink-0 text-olive-200">
        {icon}
      </span>
      {/* Flex children default to min-width:auto, so without this the long
          address and the email push the row past the container edge at 320px
          instead of wrapping inside it. */}
      <span className="min-w-0 flex-1">
        {caption ? (
          <span className="text-sand-500 block text-[0.75rem] leading-[1.8]">
            {caption}
          </span>
        ) : null}
        {children}
      </span>
    </>
  )

  return (
    <li>
      {href ? (
        <a
          href={href}
          className={`${contactRow} ${ring} text-sand-200 hover:text-sand-50 transition-colors duration-300`}
        >
          {body}
        </a>
      ) : (
        <div className={`${contactRow} text-sand-400`}>{body}</div>
      )}
    </li>
  )
}

/**
 * The site's only full-bleed dark band, and the foot of every page including
 * the 404.
 *
 * Async because the contact details are admin-editable. `getContactDetails`
 * is the reason this stays buildable: `not-found.tsx` renders this component
 * and Next prerenders it inside the image, where no database exists.
 *
 * Deliberately no <Reveal>: globals.css hides `[data-reveal]` until JS
 * releases it, and a footer whose phone numbers depend on JS arriving is a
 * footer that disappears on a bad connection.
 */
export async function SiteFooter() {
  const contact = await getContactDetails()

  return (
    // No top border. Every route ends in a light section — sand-50 above the
    // homepage and /services, sand-200 above /about and the 404 — with 112 to
    // 128px of empty page above this edge, so the band lands on whitespace
    // and wants a clean seam. The old footer's `border-line` rule would draw
    // a near-white hairline across the top of a dark band.
    <footer className="bg-olive-900">
      <Container>
        <div className="grid gap-x-8 gap-y-10 pt-14 pb-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.35fr)] lg:gap-x-10 lg:pt-16 lg:pb-12">
          {/* RTL puts the first column on the right, which is where the design
              puts the brand — so nothing is reordered with `order-*` and
              reading, visual and focus order stay the same thing. Full width
              until there is room for four tracks: it is the identity block,
              and half a row does not suit it. */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className={`inline-flex items-center gap-3.5 ${ring}`}>
              <span aria-hidden="true" className={`${badge} size-14`}>
                <LeafIcon className="text-sand-100 size-6" />
              </span>
              {/* The header's own lockup — name over role, from the same two
                  strings — so the two can never drift apart. */}
              <span className="flex flex-col">
                <span className="font-display text-sand-50 text-[1.0625rem] leading-tight font-bold">
                  {site.name}
                </span>
                <span className="text-sand-500 mt-1 text-[0.75rem] leading-tight">
                  {site.role}
                </span>
              </span>
            </Link>

            {/* Capped because the tagline's intrinsic width is around 336px:
                past that measure it collapses onto one line and the design's
                two lines are lost. The brand track is ~330px at the full
                1280 container, so without the cap it would. */}
            <p className="text-sand-400 mt-6 max-w-[19rem] text-[0.8125rem] leading-[2.1]">
              {footer.tagline}
            </p>
          </div>

          {/* Derived from the services list rather than typed out, for the
              reason the layout's JSON-LD already gives: a hand-kept copy
              silently drifts every time a service is renamed. The href rule
              is the services section's own. */}
          {/* Both link columns are desktop-only. On a phone they added
              twelve rows of links to a footer whose four sections already
              stack, and every one of them is reachable from the header menu
              two taps away — so the phone footer is the brand, the contact
              details, and nothing a visitor has to scroll past. */}
          <div className="hidden sm:block">
            <h2 className={heading}>
              {footer.servicesTitle}
              <span aria-hidden="true" className={headingRule} />
            </h2>
            <ul className="mt-2">
              {services.items.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={service.href ?? `/services/${service.slug}`}
                    className={columnLink}
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* The one column that is site navigation rather than content links,
              so it is the only one that takes a landmark — the header already
              publishes two, and a third for six repeated links is noise. */}
          <nav aria-labelledby="footer-quick" className="hidden sm:block">
            <h2 id="footer-quick" className={heading}>
              {footer.quickTitle}
              <span aria-hidden="true" className={headingRule} />
            </h2>
            <ul className="mt-2">
              {footer.quickLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={columnLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="sm:col-span-2 lg:col-span-1">
            <h2 className={heading}>
              {footer.contactTitle}
              <span aria-hidden="true" className={headingRule} />
            </h2>
            {/* `<address>` is exactly what this is — the practice's own
                contact details. Tailwind's preflight leaves the UA italic
                alone, hence `not-italic`. */}
            <address className="mt-2 not-italic">
              {/* Two-up while this column spans the whole grid, so four rows
                  do not run down one long stack under everything else. */}
              <ul className="grid gap-y-1 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-1">
                <ContactRow
                  href={`mailto:${contact.email}`}
                  icon={<MailIcon className="size-[1.05rem]" />}
                >
                  {/* A Latin run inside a Persian column needs its own
                      direction, or it is reordered around the @ — and
                      `inline-block` for the same reason as the phones, so the
                      address does not start at one edge and the email at the
                      other. */}
                  <span dir="ltr" className="inline-block max-w-full break-words">
                    {contact.email}
                  </span>
                </ContactRow>

                <ContactRow icon={<MapPinIcon className="size-[1.05rem]" />}>
                  {/* Admin-editable free text, so `<bdi>` rather than a fixed
                      dir: the direction comes from the value's own first
                      strong character, which keeps the trailing unit code
                      isolated today and renders an English address correctly
                      if one is ever pasted in. */}
                  <bdi className="text-sand-50 block font-semibold">{contact.clinic}</bdi>
                  <bdi className="mt-0.5 block leading-[2]">{contact.address}</bdi>
                </ContactRow>

                {/* Last, after the address, and no longer one anchor per row:
                    a caption can now cover two numbers, and each has to be
                    separately dialable. The row therefore carries no href and
                    each number is its own link, padded to a real tap target
                    since 13px of digits is not one. */}
                {contact.phones.map((group) => (
                  <ContactRow
                    key={group.label}
                    caption={group.label}
                    icon={<PhoneIcon className="size-[1.05rem]" />}
                  >
                    {group.values.map((value) => (
                      <a
                        key={value}
                        href={`tel:${value}`}
                        className={`text-sand-200 hover:text-sand-50 -mx-1 block rounded-lg px-1 py-1 transition-colors duration-300 ${ring}`}
                      >
                        {/* Persian on screen, Latin in the href — a tel: link
                            with Persian numerals does not dial.

                            `inline-block`, not `block`: `dir="ltr"` also sets
                            the element's own text-align to left, which would
                            strand the number at the far end of the column
                            while its caption sat beside the icon. An inline
                            box is placed at the row's inline start — the
                            right, here — and only the digits inside it are
                            ordered LTR. */}
                        <span dir="ltr" className="inline-block">
                          {toPersianDigits(value)}
                        </span>
                      </a>
                    ))}
                  </ContactRow>
                ))}
              </ul>
            </address>
          </div>
        </div>

        {/* Bottom bar. olive-700 is 1.50 against the band, which is what a
            divider wants here: present, not a second edge. Two items rather
            than three since the rights notice came out, so they sit at the
            two ends instead of needing a track apiece to keep the middle one
            centred. */}
        <div className="flex flex-col items-center gap-6 border-t border-olive-700 pt-7 pb-10 lg:flex-row lg:justify-between lg:pb-12">
          {/* Instagram and WhatsApp only. The design shows a third circle for
              Telegram and the client asked for it to go. */}
          <ul className="flex items-center gap-3">
            <li>
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={footer.social.instagram}
                className={socialLink}
              >
                <InstagramIcon className="size-[1.15rem]" />
              </a>
            </li>
            <li>
              <a
                href={site.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={footer.social.whatsapp}
                className={socialLink}
              >
                <WhatsappIcon className="size-[1.15rem]" />
              </a>
            </li>
          </ul>

          <p className="text-sand-500 text-[0.8125rem]">
            <a
              href={footer.credit.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`hover:text-sand-50 rounded-lg transition-colors duration-300 ${ring}`}
            >
              {footer.credit.label}
              {' — '}
              {/* The domain stays Latin and gets its own direction, so it does
                  not get reordered into the Persian run around it. */}
              <span dir="ltr">{footer.credit.domain}</span>
            </a>
          </p>
        </div>
      </Container>
    </footer>
  )
}
