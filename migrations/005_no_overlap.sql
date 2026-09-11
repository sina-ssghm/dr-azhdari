-- Stop appointments from overlapping each other.
--
-- `appointment_slot_unique` only catches two rows starting at the *same*
-- minute. That was nearly enough while every session was 60 minutes on a
-- half-hour grid, but it never covered the real case: a 120-minute session at
-- 09:00 and a 60-minute one at 10:00 have different start times, so the index
-- lets both in. Once working hours can start on any minute — 08:23 — almost
-- every genuine clash is an overlap rather than a collision.
--
-- The fix is a range exclusion constraint, so the database refuses the write
-- instead of relying on the UI to have offered the right slots.

-- 1. duration_min is what the range is built from; a zero would produce an
--    empty range that overlaps nothing and would quietly bypass the guard.
alter table appointment drop constraint if exists appointment_duration_positive;
alter table appointment
  add constraint appointment_duration_positive check (duration_min > 0);

-- 2. Existing overlaps have to go before the constraint can be created.
--    Nothing is deleted: the *later* row of each overlapping pair is cancelled,
--    which takes it out of the constraint's WHERE clause and leaves it visible
--    in the admin's «لغو شده» tab, recoverable by editing it to a free time.
--
--    One pass is enough — cancelling every row that overlaps an older row
--    leaves a set in which no row overlaps an older one. A row in a chain of
--    three may be cancelled although the row it clashed with was itself
--    cancelled; that is deliberate, since guessing which of a tangle to keep
--    is not the migration's call.
--    Note there is no same-day correlation: a 23:30 session running 60 minutes
--    ends at 00:30 the next day, and the constraint compares full timestamps,
--    so restricting this to matching scheduled_on would miss exactly the pairs
--    that make the ALTER below fail.
update appointment
   set status = 'cancelled'
 where status <> 'cancelled'
   and exists (
     select 1
       from appointment older
      where older.id <> appointment.id
        and older.status <> 'cancelled'
        and (older.created_at, older.id) < (appointment.created_at, appointment.id)
        and (older.scheduled_on + older.scheduled_at,
             older.scheduled_on + older.scheduled_at
               + older.duration_min * interval '1 minute')
            overlaps
            (appointment.scheduled_on + appointment.scheduled_at,
             appointment.scheduled_on + appointment.scheduled_at
               + appointment.duration_min * interval '1 minute')
   );

-- 3. The guard itself.
--
--    The date is folded into the range rather than compared separately, so the
--    only operator involved is `&&` on tsrange — which GiST supports natively.
--    Comparing scheduled_on with `=` would have needed the btree_gist
--    extension, and that is not installable on every managed Postgres.
--
--    `[)` is deliberate: a session ending at 10:00 and one starting at 10:00
--    are back-to-back, not a clash.
alter table appointment drop constraint if exists appointment_no_overlap;
alter table appointment
  add constraint appointment_no_overlap
  exclude using gist (
    tsrange(
      scheduled_on + scheduled_at,
      scheduled_on + scheduled_at + duration_min * interval '1 minute',
      '[)'
    ) with &&
  ) where (status <> 'cancelled');

-- `appointment_slot_unique` is now redundant — identical start times always
-- overlap — but it is left in place as a cheap second guard and because it
-- still serves lookups by day and time.
