-- Initial schema for the reservation system.
--
-- Service identifiers are plain text keys that match `src/content/site.ts`
-- (individual / couple / hypnotherapy). Services stay in code because they are
-- editorial content; only the data that the practice manages day-to-day —
-- prices, hours, discounts, appointments — lives here.

create table if not exists admin_user (
  id            integer primary key generated always as identity,
  username      text        not null unique,
  password_hash text        not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists service_price (
  service_id text          primary key,
  price_irt  numeric(14,0) not null default 0, -- Toman, whole numbers
  price_usdt numeric(12,2) not null default 0,
  updated_at timestamptz   not null default now()
);

-- Weekly availability. A day may hold several spans (e.g. 09:00–12:00 and
-- 16:00–20:00), so this is one row per span rather than per day.
create table if not exists working_hour (
  id      integer  primary key generated always as identity,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Saturday
  starts  time     not null,
  ends    time     not null,
  constraint working_hour_span check (ends > starts)
);

create index if not exists working_hour_weekday_idx on working_hour (weekday);

create table if not exists discount_code (
  id         integer       primary key generated always as identity,
  code       text          not null unique,
  kind       text          not null check (kind in ('percent', 'fixed')),
  value      numeric(14,2) not null check (value > 0),
  currency   text          check (currency in ('IRT', 'USDT')),
  expires_on date,
  is_active  boolean       not null default true,
  max_uses   integer       check (max_uses is null or max_uses > 0),
  used_count integer       not null default 0,
  created_at timestamptz   not null default now(),
  -- A fixed-amount discount is meaningless without a currency.
  constraint discount_fixed_needs_currency
    check (kind <> 'fixed' or currency is not null),
  constraint discount_percent_range
    check (kind <> 'percent' or value <= 100)
);

-- Which services a code applies to. No rows means "every service".
create table if not exists discount_code_service (
  discount_code_id integer not null references discount_code (id) on delete cascade,
  service_id       text    not null,
  primary key (discount_code_id, service_id)
);

create table if not exists appointment (
  id             integer       primary key generated always as identity,
  service_id     text          not null,
  scheduled_on   date          not null,
  scheduled_at   time          not null,
  duration_min   smallint      not null default 60,
  full_name      text          not null,
  phone          text          not null,
  email          text,
  notes          text,
  status         text          not null default 'pending'
                   check (status in ('pending', 'confirmed', 'cancelled')),
  payment_method text          check (payment_method in ('iran', 'international', 'none')),
  payment_status text          not null default 'unpaid'
                   check (payment_status in ('unpaid', 'paid', 'waived')),
  amount         numeric(14,2),
  currency       text          check (currency in ('IRT', 'USDT')),
  discount_code  text,
  created_by     text          not null default 'public'
                   check (created_by in ('public', 'admin')),
  created_at     timestamptz   not null default now()
);

-- The database is the source of truth for double-booking, not the UI: two
-- visitors submitting the same slot at once must not both succeed.
create unique index if not exists appointment_slot_unique
  on appointment (scheduled_on, scheduled_at)
  where status <> 'cancelled';

create index if not exists appointment_day_idx on appointment (scheduled_on);
