-- Online psychological questionnaires.
--
-- The questions, scoring keys and interpretation bands live in code
-- (src/content/tests) because they are the instruments themselves — editorial
-- content that changes only when the therapist revises one. What the practice
-- edits day to day is the price, and what accumulates is the orders.
--
-- There are no user accounts on this site. A test is therefore reached through
-- an unguessable token issued once the payment is approved: the token is the
-- authorisation, the same way a booking reference already is.

create table if not exists psy_test_price (
  test_id    text          primary key,
  price_irt  numeric(14,0) not null default 0, -- Toman, for visitors in Iran
  price_usdt numeric(12,2) not null default 0, -- for visitors abroad
  -- Lets the practice take a test off the public list without losing its price.
  enabled    boolean       not null default true,
  updated_at timestamptz   not null default now()
);

-- Zero is free, which is a deliberate default: a test nobody has priced yet
-- must not quietly start charging.
insert into psy_test_price (test_id)
values ('bdi2'), ('enrich'), ('ysq_s3'), ('neo_ffi'), ('mcmi')
on conflict (test_id) do nothing;

create table if not exists test_order (
  id             integer     primary key generated always as identity,

  -- Identifies the order while it is being paid for. Public, but only to the
  -- person who made it.
  order_ref      uuid        not null unique,

  -- Issued when the payment is approved, and the only way into the test.
  -- Null until then, so an unapproved order simply has no door.
  access_token   text        unique,

  test_id        text        not null,
  full_name      text        not null,
  phone          text        not null,
  email          text,

  -- Which price applied. Kept per order because the tariff can change later
  -- and an old order must still say what was actually charged.
  region         text        not null check (region in ('iran', 'abroad')),
  amount         numeric(14, 2) not null default 0,
  currency       text        not null check (currency in ('IRT', 'USDT')),

  payment_status text        not null default 'unpaid'
                 check (payment_status in ('unpaid', 'pending_review', 'paid', 'rejected')),
  receipt_path   text,

  -- Saved as the visitor goes, so a dropped connection or a closed tab does
  -- not cost somebody seventy-five answers.
  answers        jsonb       not null default '{}'::jsonb,
  -- Computed once, at submission. Stored rather than recomputed so a later
  -- revision of an instrument cannot silently restate somebody's old result.
  result         jsonb,

  issued_at      timestamptz,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- The admin list is "what needs attention, newest first".
create index if not exists test_order_status_idx
  on test_order (payment_status, created_at desc);

create index if not exists test_order_phone_idx on test_order (phone);
