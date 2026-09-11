-- A fixed-amount discount now carries a value for BOTH currencies.
--
-- Previously a fixed code stored one `value` plus a `currency`, so a code was
-- only usable by visitors paying in that one currency — the other half of the
-- audience silently got "این کد برای روش پرداخت انتخاب‌شده معتبر نیست".
-- Percentage codes are unaffected and keep using `value`.

alter table discount_code
  add column if not exists amount_irt  numeric(14,0),
  add column if not exists amount_usdt numeric(12,2);

-- Carry existing fixed codes over into whichever column matches their currency.
update discount_code set amount_irt = value
  where kind = 'fixed' and currency = 'IRT' and amount_irt is null;

update discount_code set amount_usdt = value
  where kind = 'fixed' and currency = 'USDT' and amount_usdt is null;

-- Anything left half-filled would fail the new constraint; default it to zero
-- so the admin can correct it rather than the migration failing.
update discount_code set amount_irt = 0 where kind = 'fixed' and amount_irt is null;
update discount_code set amount_usdt = 0 where kind = 'fixed' and amount_usdt is null;

-- Replace the old shape rules.
alter table discount_code drop constraint if exists discount_fixed_needs_currency;
alter table discount_code drop constraint if exists discount_percent_range;
alter table discount_code drop constraint if exists discount_code_value_check;
alter table discount_code alter column value drop not null;

alter table discount_code
  add constraint discount_shape check (
    (kind = 'percent' and value is not null and value > 0 and value <= 100)
    or
    (kind = 'fixed' and amount_irt is not null and amount_usdt is not null
       and amount_irt >= 0 and amount_usdt >= 0)
  );
