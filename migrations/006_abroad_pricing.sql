-- Three tariffs per tier, and payment rails that can tell them apart.
--
-- Until now a booking was either "iran" (toman, card) or "international"
-- (tether). A client abroad can also pay by card to the same Iranian account,
-- at a different toman price — which is neither of those, and which the old
-- two-value payment_method could not express.
--
-- Must ship together with the duration swap in src/content/booking-page.ts:
-- PRICE_TIERS is derived from that file, and a tier with no row here prices at
-- zero.

-- 1. The third tariff, seeded from the domestic one so nothing reads as
--    unpriced on day one. The practice can then adjust it.
alter table service_duration_price
  add column if not exists price_irt_abroad numeric(14,0) not null default 0;

update service_duration_price
   set price_irt_abroad = price_irt
 where price_irt_abroad = 0;

-- 2. Re-key the tiers to the new session lengths: hypnotherapy drops to a
--    single hour, couple therapy gains the 90/120 choice. Carry the money
--    across rather than leaving the new rows at zero.
insert into service_duration_price
  (service_id, duration_min, price_irt, price_irt_abroad, price_usdt)
select 'hypnotherapy', 60, price_irt, price_irt_abroad, price_usdt
  from service_duration_price
 where service_id = 'hypnotherapy' and duration_min = 90
on conflict (service_id, duration_min) do nothing;

insert into service_duration_price
  (service_id, duration_min, price_irt, price_irt_abroad, price_usdt)
select 'couple', length.minutes, p.price_irt, p.price_irt_abroad, p.price_usdt
  from service_duration_price p
 cross join (values (90), (120)) as length(minutes)
 where p.service_id = 'couple' and p.duration_min = 60
on conflict (service_id, duration_min) do nothing;

-- The superseded rows — hypnotherapy 90/120 and couple 60 — are left in place.
-- The application ignores any tier not in PRICE_TIERS, and they are the only
-- record of the old pricing if a length is ever brought back.

-- 3. Widen the payment rails. 001_init.sql allowed exactly
--    ('iran', 'international', 'none'), so a third rail would be rejected with
--    SQLSTATE 23514 — which nothing maps to a friendly message.
alter table appointment drop constraint if exists appointment_payment_method_check;

update appointment set payment_method = 'iran_card' where payment_method = 'iran';
update appointment
   set payment_method = 'abroad_crypto'
 where payment_method = 'international';

alter table appointment
  add constraint appointment_payment_method_check
  check (payment_method in ('iran_card', 'abroad_card', 'abroad_crypto', 'none'));
