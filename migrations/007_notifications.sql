-- Notifications: browser push, and Telegram via a bot.
--
-- Both are opt-in from the dashboard. Nothing here is required for the site to
-- work; with no rows and no settings, sending is a no-op.

-- One row per browser that has granted permission. An admin may use a phone
-- and a laptop, so this is not a single record.
create table if not exists push_subscription (
  id         integer     primary key generated always as identity,
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth       text        not null,
  -- Free text from the user agent, so a stale device can be recognised.
  label      text,
  created_at timestamptz not null default now()
);

-- Pairing codes for the Telegram bot. The admin sends the code to the bot and
-- the server matches it against getUpdates to learn the chat id — no public
-- webhook, which would need a route reachable from Telegram's servers.
create table if not exists telegram_pairing (
  code       text        primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Expired codes are swept on each new request rather than by a scheduler.
create index if not exists telegram_pairing_expiry_idx on telegram_pairing (expires_at);
