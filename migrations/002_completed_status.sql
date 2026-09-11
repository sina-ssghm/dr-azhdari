-- Adds a "completed" state.
--
-- The lifecycle was pending → confirmed → cancelled, which could record that a
-- session was booked but not that it actually happened. The appointments list
-- filters on رزرو شده / انجام شده / لغو شده, so the third state has to exist.
--
-- "رزرو شده" covers both pending and confirmed: the distinction between them
-- is about payment, not about whether the appointment is still upcoming.

alter table appointment drop constraint if exists appointment_status_check;

alter table appointment
  add constraint appointment_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'completed'));
