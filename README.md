# وب‌سایت دکتر زهره اژدری

Marketing site **and** booking system for a psychotherapy / hypnotherapy
practice. Persian (fa-IR), RTL, built to match the approved design.

A visitor picks a service, a session length, a day and one or more hours, then
says where they are and how they want to pay, then lands on a payment page and
uploads a receipt. The admin panel behind `/admin` owns the schedule, the prices, the
discount codes, the payment details and the confirmation of each receipt.

---

## Stack

| Concern   | Choice                                 | Why                                                                                             |
| --------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Framework | Next.js 15 (App Router)                | One codebase for UI _and_ backend — every mutation is a Server Action, no separate API service. |
| Language  | TypeScript (strict)                    | `noUncheckedIndexedAccess` and `noUnusedLocals` are on.                                         |
| Database  | PostgreSQL via `pg` (pooled)           | Runs **outside** Docker. Plain SQL migrations, no ORM.                                          |
| Styling   | Tailwind CSS v4                        | CSS-first config; all design tokens live in `src/app/globals.css` under `@theme`.               |
| Font      | Vazirmatn v33 (variable), self-hosted  | Google Fonts is unreliable from inside Iran. One 109 KB woff2 covers weights 100–900.           |
| Icons     | Hand-authored inline SVG               | Matches the design's 1.5px rounded stroke; no icon-library payload.                             |
| Calendar  | `Intl.DateTimeFormat` Persian calendar | Jalali dates with no date library. See `src/lib/jalali.ts`.                                     |
| Animation | IntersectionObserver + CSS             | ~20 lines instead of an animation library; honours `prefers-reduced-motion`.                    |

Marketing pages are statically prerendered; anything that reads the database is
`force-dynamic`, so `next build` never needs a live Postgres.

---

## Getting started

```bash
npm install
cp .env.example .env         # fill in the variables below
npm run db:migrate           # needs DATABASE_URL pointing at localhost
npm run db:seed -- 09392738157 'your-password'
npm run dev                  # http://localhost:3000
```

| Variable               | Required | Notes                                                                                                  |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`         | yes      | Percent-encode the password if it contains `@`, `:`, `/` or `#`.                                       |
| `SESSION_SECRET`       | yes      | ≥ 32 chars. Signs the admin cookie; rotating it signs everyone out.                                    |
| `NEXT_PUBLIC_SITE_URL` | yes      | Baked into the client bundle at build time.                                                            |
| `HOST_PORT`            | no       | Host port for the container. Default `3100`.                                                           |
| `RECEIPT_DIR`          | no       | Where uploaded receipts are written. Default `/data/receipts` — set it to a local path outside Docker. |

### Scripts

| Command              | Does                                                           |
| -------------------- | -------------------------------------------------------------- |
| `npm run dev`        | Dev server with hot reload                                     |
| `npm run build`      | Production build (emits `.next/standalone`)                    |
| `npm start`          | Serve the production build                                     |
| `npm run lint`       | ESLint                                                         |
| `npm run typecheck`  | `tsc --noEmit`                                                 |
| `npm run format`     | Prettier                                                       |
| `npm run db:migrate` | Applies `migrations/*.sql` in order; idempotent                |
| `npm run db:seed`    | Creates or resets the admin account                            |
| `npm run e2e`        | Drives a real browser through admin + booking + payment        |
| `npm run screenshot` | Renders the running site at 1440/1280/390 into `.screenshots/` |
| `npm run photo`      | Installs a real photo into `public/images` (see below)         |
| `npm run flags`      | Re-copies the country flags into `public/flags`                |

---

## Before this goes live

1. **Change the admin password** at `/admin/password`. The seeded one was chosen
   over chat and should not survive into production.
2. **Fill in `/admin/settings`.** Until the card number, sheba, holder name,
   USDT address and network are set, the payment page has nothing to show and
   visitors reach a dead end after booking.
3. **Set the prices** at `/admin/prices` — three tariffs per service _and_
   session length — and the weekly schedule at `/admin/hours`. With no hours
   saved the booking calendar has no open days at all, and an unpriced tier
   cannot be booked at all.
   Migration 006 seeds the abroad tariff from the domestic one, so check it.
4. **Set `NEXT_PUBLIC_SITE_URL`** to the real domain. The fallback in
   `src/content/site.ts` (`https://drazhdari.ir`) is a guess and would emit
   wrong canonical / Open Graph / sitemap URLs.
5. **Back up `data/receipts`.** Those are payment records; they live on the host
   filesystem, not in Postgres, so a database backup alone doesn't cover them.

To swap a photo:

```bash
npm run photo -- hero    /path/to/portrait.jpg
docker compose restart web     # public/images is bind-mounted; no rebuild
```

See `public/images/README.md` for sizes and crop notes.

---

## Project layout

```
migrations/                 plain SQL, applied in filename order
src/
├─ app/
│  ├─ layout.tsx            document shell only: <html lang="fa" dir="rtl">
│  ├─ (site)/               the public site — header, footer, marketing pages
│  │  ├─ page.tsx           the homepage
│  │  └─ booking/           the flow, then [ref]/pay for payment + receipt
│  ├─ admin/
│  │  ├─ login/             the only unguarded admin route
│  │  ├─ (protected)/       everything behind the session check
│  │  └─ receipts/[name]/   serves an uploaded receipt to a signed-in admin
│  ├─ globals.css           design tokens (@theme) + base styles
│  └─ sitemap.ts robots.ts  generated from src/content/site.ts
├─ components/
│  ├─ layout/               site-header (floating pill nav), site-footer
│  ├─ sections/             hero, services, booking-cta, why-counselling
│  ├─ booking/              the wizard: service → date/time → details → pay → review
│  ├─ admin/                modal, action-button, money-input, chips, time-field, digits-input
│  ├─ ui/                   button, container, jalali-calendar, reveal, …
│  └─ icons/                the whole icon set + a name→component registry
├─ content/                 ← every user-facing string and data item
├─ server/                  appointments, settings, discounts, session (server-only)
├─ lib/                     db pool, auth, receipts, jalali, time, payment rails, cn()
└─ fonts/                   Vazirmatn-Variable.woff2
```

**Copy changes go in `src/content/`.** Components never hard-code text:
`site.ts` is the public site, `booking-page.ts` the reservation flow,
`admin.ts` the panel.

### Direction

The document is `dir="rtl"`. Layout and text use _logical_ properties
(`ms-*`, `pe-*`, `border-s`) so the first flex/grid child renders on the right.
Two decorative exceptions are pinned with _physical_ properties and commented as
such: the hero portrait (`right-0`) and its gradient masks.

### Country flags

`public/flags/` holds 265 SVGs (174 KB), copied from the `country-flag-icons`
dev dependency by `npm run flags` and committed so the Docker build needs no
extra step.

They are files rather than emoji flags on purpose: emoji flags are
regional-indicator pairs and Windows ships no glyphs for them, so the picker
rendered "IR", "DE" as letters for every desktop visitor. Each row's flag is
`loading="lazy"` — without that, opening the picker would fire 265 requests for
images nobody has scrolled to. Measured: one before opening, ~80 after.

### The floating header

`SiteHeader` is `fixed` and **`pointer-events-none`**, with `pointer-events-auto`
put back on only the parts that are actually visible — the nav pill and the
desktop CTA. Do not remove that.

Transparent is not the same as tap-through. The header's box covers its own
padding _and_ the collapsed mobile drawer, which stays laid out so it can
animate: about 430 px of invisible area lying over the top of every page. Left
hit-testable, it silently swallowed every tap aimed at the content beneath, and
the symptom looked nothing like the cause — a card could not be tapped at the
top of the screen but worked once scrolled further down.

The closed drawer is also `inert`, so an invisible menu is not in the focus
order or the accessibility tree. `npm run e2e` measures both: it probes
`elementFromPoint` inside the header's dead zone and taps a card parked there.

The admin panel's mobile menu has the same rule for a different reason: it is
positioned **absolutely inside the sticky bar**, not placed in the flow after
it. In the flow it pushed the whole page down as it opened, so the scroll
position ended up in the middle of the menu — the first entries sat above the
viewport and closing it shifted everything back.

---

## Deploying (Iranian host / VPS)

`next.config.ts` sets `output: 'standalone'`, so the build emits a
self-contained server.

### Docker Compose (app in a container, PostgreSQL on the host)

PostgreSQL deliberately runs **outside** Docker. The container reaches it over
the network, so `docker compose down` never touches your data.

```bash
cp .env.example .env      # set DATABASE_URL, HOST_PORT, NEXT_PUBLIC_SITE_URL
docker compose up -d --build
```

Site: `http://localhost:3100` (or whatever `HOST_PORT` is).

| Connecting from      | Host to use            |
| -------------------- | ---------------------- |
| Inside the container | `host.docker.internal` |
| The host (psql, GUI) | `localhost`            |

`extra_hosts: host.docker.internal:host-gateway` in `docker-compose.yml` makes
that name resolve on Linux daemons too, so the same file works on a VPS.

Two host paths are bind-mounted, both deliberately outside the image:

| Host            | Container            | Why                                                     |
| --------------- | -------------------- | ------------------------------------------------------- |
| `public/images` | `/app/public/images` | Read-only. Swap a photo with a restart, not a rebuild.  |
| `data/receipts` | `/data/receipts`     | Uploaded payment receipts; must survive `compose down`. |

`TZ: Asia/Tehran` is set on the container. Without it the server runs UTC and
judges "has this slot already passed?" 3.5 hours behind Tehran, leaving this
morning's appointments bookable until mid-afternoon.

**Which changes need a rebuild?**

- `DATABASE_URL`, `SESSION_SECRET` — no. Read at runtime: `docker compose up -d`.
- `NEXT_PUBLIC_SITE_URL` — yes. Baked into the client bundle:
  `docker compose up -d --build`.

The footer's contact details are the one admin setting that reaches pages
rendered at build time. Saving them revalidates those pages inside the running
container, and a rebuild discards that — so after a deploy the ten prerendered
pages carry the defaults from `src/content/site.ts` until they revalidate,
which they now do within an hour. To see an edit immediately after a rebuild,
open **/admin/settings** and press save.

#### Checking the database connection

```bash
curl http://localhost:3100/api/health
```

```jsonc
{
  "status": "ok",
  "app": "up",
  "db": { "ok": true, "serverVersion": "PostgreSQL 16.x", "latencyMs": 4 },
}
```

Returns **503** with `"status": "degraded"` when the database is unreachable.
The marketing pages keep serving either way; only `/booking` and `/admin` need
the database.

Common failures:

| `db.error` contains              | Meaning                                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `password authentication failed` | Networking is fine; the credentials in `DATABASE_URL` are wrong.                                           |
| `ECONNREFUSED` / timeout         | Postgres isn't listening on the host, or `listen_addresses`/`pg_hba.conf` blocks the Docker bridge subnet. |
| `database "…" does not exist`    | Create it: `CREATE DATABASE dr_azhdari;`                                                                   |

If Postgres refuses the Docker subnet, add to `pg_hba.conf`
(then reload):

```
host    all    all    172.16.0.0/12    scram-sha-256
```

### Bare VPS (Node ≥ 20.9)

```bash
npm ci && npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
NODE_ENV=production node .next/standalone/server.js   # listens on :3000
```

Put nginx/Caddy in front for TLS. Works on Liara, ArvanCloud, or any VPS.

> Vercel and Netlify are **not** suitable here — both are generally unreachable
> from inside Iran, which is where the audience is.

---

## Admin panel

**URL: `/admin` — sign in at `/admin/login`.**

Deliberately unlinked from the public site and excluded in `robots.txt`. That
is obscurity, not security; the real protection is the password.

| Page                  | What it does                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `/admin`              | Waiting receipts, then the five soonest upcoming appointments                                |
| `/admin/appointments` | Waiting receipts, then every booking: filter, search, page, edit, confirm / cancel / delete  |
| `/admin/hours`        | Weekly schedule — one or more spans per weekday, typed as four digits (`0823` → 08:23)       |
| `/admin/prices`       | تعرفه‌ها: three tariffs per service × session length — domestic card, abroad card, USDT      |
| `/admin/discounts`    | Codes: percent or fixed, expiry, usage cap, active toggle, and which services apply          |
| `/admin/settings`     | Payment details shown to visitors: card number, sheba, holder name, USDT address and network |
| `/admin` → «اعلان‌ها» | Turns notifications on: browser push per device, and Telegram via the practice's own bot     |
| `/admin/password`     | Change the password                                                                          |

**Receipts waiting to be checked appear twice**, at the top of the dashboard and
at the top of the appointments list, deliberately outside the search and status
filters: it is a to-do list, and it should not empty out because the admin
happened to be searching for a name. One entry per _booking_, not per session —
three hours paid for together are one decision. Opening the receipt is how that
decision is made, and both «تأیید پرداخت» and «رد رسید» stay available
afterwards, so a rejection made by mistake can be undone. Rejecting also returns
the appointment to «در انتظار»; leaving it confirmed while its payment is unpaid
said two different things about the same booking.

All dates in the panel are Jalali. Times are typed, not picked from a list:
four digits are a time (`0823` → 08:23), three are enough when the leading
digit cannot start a two-digit hour (`823` → 08:23), and out-of-range input is
clamped rather than rejected. Arrow keys nudge by a minute, Shift+arrow by an
hour.

Tapping a time selects all of it, so the next digit starts a new entry — on
focus _and_ on click, because focus fires only once and tapping an already-open
field is the natural "start over" gesture. The deferred second `select()` that
works around Safari collapsing the selection is cancelled on the first
keystroke; left to run it re-selects mid-entry and eats the digit just typed.

The card number and sheba on `/admin/settings` accept digits only and are
length-checked (16 and 24). The `IR` on the sheba is fixed chrome — type only
the digits; it is re-attached when stored, which is the form the payment page
renders and copies.

### First-time setup

```bash
createdb dr_azhdari                      # or: CREATE DATABASE dr_azhdari;
npm run db:migrate                       # applies migrations/*.sql, idempotent
npm run db:seed -- 09392738157 'your-password'
```

`db:migrate` and `db:seed` run on the **host**, so point `DATABASE_URL` at
`localhost` for them; the container uses `host.docker.internal`.

> Do not leave `DATABASE_URL` exported in the shell you then run
> `docker compose up` from. Compose prefers the environment over `.env`, so the
> container is handed the `localhost` form and cannot reach Postgres at all —
> every page renders «اتصال به پایگاه داده برقرار نشد».

`db:seed` upserts, so re-running it is also how you reset a forgotten password.

### How availability works

Slots are **derived**, never stored. A weekday's spans become merged minute
intervals at request time; start times are offered every 30 minutes **anchored
to the span's own start**, and only where the whole session fits. A span
beginning at 08:23 therefore offers 08:23, 08:53, 09:23… The schedule decides
the grid, not the other way round — working hours accept any minute.

Touching spans are merged, so a session can cross the seam between 08:00–12:00
and 12:00–16:00 instead of being stranded at the boundary. Editing the schedule
changes what visitors see instantly, with no backfill.

### Why nothing can double-book

Everything here is an interval, never a point in time. Three guards, in order
of how much they can be trusted:

1. **The picker** hides hours that clash with one already chosen — 16:30 and
   17:00 are distinct starts, but as 60-minute sessions they are the same half
   hour twice.
2. **The submit action** re-checks the chosen hours against each other and
   against the schedule, server-side.
3. **The database** has the last word: `appointment_no_overlap` is a GiST
   exclusion constraint over `tsrange(start, start + duration)`, so an
   overlapping row is refused however it was submitted.

The third one matters because the other two can be bypassed and because of a
race: two visitors submitting the same time at once. The older
`appointment_slot_unique` index only caught rows starting at the _same_ minute,
which missed the common case — a 120-minute session at 09:00 and a 60-minute
one at 10:00 overlap but do not collide. Both SQLSTATEs (`23505`, `23P01`) map
to `SlotTakenError`, so the loser of a race gets a clean message.

> `005_no_overlap.sql` **cancels** the later row of any pre-existing overlapping
> pair before adding the constraint — nothing is deleted, and the cancelled
> rows stay visible under «لغو شده».

The picker opens on the soonest day that actually has a free slot, so someone
arriving after the last appointment of the day doesn't see an empty grid.

### The booking flow

A wizard: one question per screen, each with a gate that must pass before the
next appears. Finished steps in the indicator are buttons back to themselves;
forward jumps over an unmet gate are refused.

1. **Service and length.** مشاوره فردی and هیپنوتراپی run 60 minutes.
   مشاوره زوج و خانواده is 90 or 120 and asks which _before_ showing any times,
   since the length decides which starts fit. هیپنوتراپی shows a referral
   notice: it needs the doctor's assessment first.
2. **Day, then hours.** One day, but as many separate hours on it as wanted.
   The price is quoted per session and multiplied by the count.
3. **Details.** The phone field carries a searchable country picker that
   defaults to Iran, and validates against that country's real rules via
   `libphonenumber-js` — not a length range. Numbers are stored in **E.164**
   (`+989123456789`), because a bare `0912…` means nothing to someone dialling
   from abroad. The admin search tries the term with and without a leading
   zero, so `0912…` still finds them.
4. **How to pay** — see below. Deliberately shows no prices.
5. **Review.** Everything is shown back before anything is written, with the
   phone and email deliberately enlarged — a typo there is how a booking
   becomes unreachable. This is the only screen with an amount on it, which is
   also why the discount field lives here: applying a code has a visible
   effect. «ویرایش» returns to the form.
6. **Payment.** Confirming writes the appointments and redirects to
   `/booking/<ref>/pay` — a `uuid`, so the URL isn't guessable from an id.
   Iranian bookings get the details drawn as a bank card: number grouped in
   fours, sheba in the standard IBAN grouping, holder name. Digits stay Latin
   there on purpose — the visitor is about to retype them into a banking app —
   and the copy buttons yield the raw value, never the spaced one. International
   bookings see the USDT address, its network, and a QR generated server-side.
7. **Receipt.** «پرداخت کردم» opens the uploader — drop or pick a file, see it
   previewed, watch a real percentage while it sends. The booking then moves to
   _در انتظار تأیید پرداخت_ until an admin confirms it on `/admin/appointments`.

   The upload goes to a **route handler** (`/api/booking/<ref>/receipt`) rather
   than a Server Action, for two reasons. Actions post opaquely, so the browser
   cannot report progress — and a silent minute on a phone connection is how
   someone concludes the site is broken and gives up half-paid. Actions also cap
   the request body at 1 MB by default, which quietly rejected most of the 5 MB
   photos this form invites.

Prices, discounts and the final amount are all resolved **server-side** at
submit. The browser never supplies an amount — it is never even sent the tariff
table; the review step asks for a quote, computed by the same code the submit
uses. Every chosen slot is re-checked against the schedule before the write.

### Three tariffs, three rails

Paying is two decisions: where the client is, and how they want to pay.

| Rail            | Region        | Instrument   | Priced in            |
| --------------- | ------------- | ------------ | -------------------- |
| `iran_card`     | داخل ایران    | card-to-card | toman, domestic      |
| `abroad_card`   | خارج از ایران | card-to-card | toman, abroad tariff |
| `abroad_crypto` | خارج از ایران | tether       | USDT                 |

Crypto inside Iran is never offered, so there are three legal combinations, not
four. They are stored as one enumerated `payment_method` rather than a region
column plus an instrument column, because **neither half is enough on its own**:
the payment page picks card-versus-crypto (and both card rails are cards), while
pricing picks one of three tariffs (and both card rails are toman). `currency`
stays two-valued — it says what `amount` is denominated in, and an abroad card
payment is still toman.

Every rail-to-number decision goes through `priceFor` in `src/lib/payment.ts`.
Keying on the currency instead would silently charge an abroad card payer the
domestic tariff, with no type error and no runtime error.

> A fixed-toman discount code takes its full value off both toman tariffs.
> Deliberate — a percentage code is the way to discount both proportionally.

## Notifications

Opt-in, from the «اعلان‌ها» button beside the dashboard title. Two independent
channels, fired at exactly two moments:

- **A receipt arrives** — 🧾, the whole reservation, and the receipt itself
  attached. Nothing is sent when the booking is first made: a reservation with
  no receipt is not yet something to act on.
- **The payment is confirmed** — ✅ and the whole reservation again, so the
  message stands on its own as a record rather than needing the panel open
  beside it.

Links are absolute. A bare `/admin/appointments` is not tappable in Telegram,
so `NEXT_PUBLIC_SITE_URL` is prepended before sending.

**Browser push** is per device, so a phone and a laptop each subscribe. VAPID
keys are generated on first send and kept in `app_setting` rather than the
environment — turning it on needs no redeploy and no file editing. When a push
service answers 404 or 410 the browser has thrown the subscription away (reset
phone, revoked permission) and the row is deleted rather than retried on every
future booking. `public/sw.js` caches nothing; it exists only so a push can be
shown while the panel is closed.

**Telegram** goes through a bot the practice creates with @BotFather. The token
lives on `/admin/settings`; the dashboard dialog only offers a token field
while none is saved, so it is a shortcut for the first run rather than a second
place to edit it.

**One bot, several recipients.** Each person pairs separately: press for a code,
send it to the bot, press «بررسی اتصال». Every paired chat gets every alert, and
one blocked chat does not stop the others. Recipients are rows in
`telegram_recipient` — it used to be a single `app_setting`, so pairing a second
phone silently replaced the first while the panel claimed both were connected.

Pairing polls `getUpdates` rather than using a webhook: a webhook needs a URL
Telegram can reach and a secret to verify it, for what is a one-off step the
admin triggers by hand.

The receipt travels as the photo's caption (`sendPhoto`, or `sendDocument` for
a PDF) so the image and the details arrive as one message. It is not attached
to the browser push: the file sits behind the admin session, so the browser
could not fetch it to render — tapping through opens the panel, which can.

`notifyAdmin` never throws. A booking must not fail because a push service was
unreachable, so every delivery error is logged and swallowed.

`TELEGRAM_API_URL` points the bot at a stand-in server, which is how the
message bodies and the file upload were verified without a real bot. Leave it
unset in production.

---

### Security notes

- Passwords are hashed with **scrypt** from `node:crypto` — memory-hard, no
  native module needed in the Alpine image.
- The session is a signed, httpOnly cookie. It embeds a fingerprint of the
  current password hash, so **changing the password invalidates every other
  session**, including any leaked cookie.
- The session cookie lasts a **week**. The panel is used from a phone all day,
  and signing in twice a day was the main friction; changing the password still
  kills every existing token, which is the control that matters.
- `SESSION_SECRET` must be set and at least 32 characters. Rotating it signs
  everyone out.
- The cookie's `Secure` flag follows `x-forwarded-proto`, not `NODE_ENV`. Behind
  the Cloudflare tunnel the container only ever sees plain HTTP, so keying it off
  the build mode would mark the cookie Secure on `http://localhost` too — where
  Chrome then withholds it from Server Action POSTs and every save silently
  bounces you to the login page.
- Prices and discounts are re-resolved **server-side** at submit; the browser
  never supplies an amount.
- **Uploaded receipts never go in `public/`.** They are financial documents, and
  anything under `public/` is served to the world without a session check. They
  are written to `RECEIPT_DIR` (outside the web root) under a random UUID
  filename, and reach the browser only through `/admin/receipts/<name>`, which
  requires a signed-in admin and strips everything outside `[a-zA-Z0-9._-]` from
  the name, so no `..` or separator can climb out of the directory.
  The upload is capped at 5 MB and limited to JPEG / PNG / WebP / PDF. Both
  limits live in `lib/receipt-limits.ts` and are applied twice: in the browser
  so a doomed file does not cost a minute of uploading first, and again in the
  route handler, which is the one that decides.

### Testing it

```bash
npm run e2e        # 73 checks against a running instance
```

Signs in, saves per-duration prices, hours and payment settings, creates a
discount, books through the public flow — including two hours on one day, the
hypnotherapy duration prompt, the review step and the payment page — uploads a
receipt, then confirms it back in the admin panel.

Four things it is easy to get wrong when extending it:

- **Scope selectors to `main`.** The sidebar's sign-out form comes first in the
  DOM, so a bare `button[type=submit]` matches _that_ and the run looks like a
  session bug.
- **It writes real rows, and clears them at the start of the next run.**
  Bookings are made with three reserved phone numbers and deleted by phone
  before each run. Cleaning at the start rather than the end leaves a failed
  run's data in place to inspect. Skipping the cleanup — no `DATABASE_URL` —
  fills the schedule until the 120-minute check can no longer find a two-hour
  window, and the failure looks nothing like its cause.
- **The booking it creates carries a per-run suffix in the name.** Without it,
  `.first()` eventually matches an already-confirmed booking from an earlier run
  and the confirm step hangs.
- **It leaves the schedule at 08:23.** That is deliberate — the off-grid start
  is what proves arbitrary minutes survive a round trip — so reset the real
  working hours in `/admin/hours` after running it against a live instance.

---

## Database

Migrations are plain SQL in `migrations/`, applied in filename order by
`scripts/migrate.mjs` and recorded in a `_migration` table, so re-running is a
no-op. To add one, drop in `005_….sql` and run `npm run db:migrate` — there is
no down-migration; write forward-only changes.

| Table                    | Holds                                             |
| ------------------------ | ------------------------------------------------- |
| `admin_user`             | The single account: username + scrypt hash        |
| `working_hour`           | Weekly spans, one row per weekday span            |
| `service_duration_price` | Three tariffs per (service, session length)       |
| `discount_code`          | Codes, expiry, cap and use count                  |
| `discount_code_service`  | Which services each code applies to               |
| `appointment`            | One row per booked hour, grouped by `booking_ref` |
| `app_setting`            | Key/value payment details from `/admin/settings`  |

`service_price` from `001_init.sql` is superseded by `service_duration_price`
and no longer read; it is left in place rather than dropped so an older
deployment can be rolled back without losing data.

A multi-hour booking is several `appointment` rows sharing one `booking_ref`;
that ref is the payment URL and what the receipt attaches to.

---

## Possible next steps

- **SMS confirmation** through an Iranian gateway (Kavenegar / SMS.ir) when a
  payment is confirmed. The phone is already validated and stored.
- **Rate limiting** on `submitBookingAction`. Nothing today stops a script from
  filling the calendar with unpaid holds.
- **Checksum validation** on the card number (Luhn) and sheba (IBAN mod-97).
  Length is checked today, which catches a truncated paste but not a
  transposed digit in an account people send money to.
- **Expiring unpaid bookings** — a slot currently stays held even if the receipt
  never arrives.
- **Articles.** `/articles` is still a placeholder page.
