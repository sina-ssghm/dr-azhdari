-- Multi-slot bookings, per-duration pricing, and the payment/receipt flow.

-- 1. Prices are now per (service, duration). Hypnotherapy runs 90 or 120
--    minutes and costs differently at each; the other services stay at 60.
create table if not exists service_duration_price (
  service_id   text          not null,
  duration_min smallint      not null check (duration_min > 0),
  price_irt    numeric(14,0) not null default 0,
  price_usdt   numeric(12,2) not null default 0,
  updated_at   timestamptz   not null default now(),
  primary key (service_id, duration_min)
);

-- Carry the existing flat prices over as the 60-minute tier so nothing is lost.
insert into service_duration_price (service_id, duration_min, price_irt, price_usdt)
select service_id, 60, price_irt, price_usdt from service_price
on conflict (service_id, duration_min) do nothing;

-- 2. Free-form settings: card number, sheba, wallet address, network…
--    A key/value table rather than columns, so adding a payment detail later
--    needs no migration.
create table if not exists app_setting (
  key        text        primary key,
  value      text        not null default '',
  updated_at timestamptz not null default now()
);

-- 3. A booking groups the sessions paid for together. Contact details stay on
--    the appointment row so the admin list can still search and sort without
--    a join; `booking_ref` is what ties siblings together for payment.
alter table appointment
  add column if not exists booking_ref  uuid,
  add column if not exists receipt_path text;

-- Existing rows each become their own single-session booking.
update appointment set booking_ref = gen_random_uuid() where booking_ref is null;
alter table appointment alter column booking_ref set default gen_random_uuid();
alter table appointment alter column booking_ref set not null;

create index if not exists appointment_booking_ref_idx on appointment (booking_ref);

-- 4. A receipt has been uploaded but not yet checked by the practice.
alter table appointment drop constraint if exists appointment_payment_status_check;
alter table appointment
  add constraint appointment_payment_status_check
  check (payment_status in ('unpaid', 'pending_review', 'paid', 'waived'));
