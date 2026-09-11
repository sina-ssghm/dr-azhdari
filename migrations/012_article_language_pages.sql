-- Language and length, shown on the article cards.
--
-- Language is stored rather than guessed at render: the titles happen to be
-- unambiguous today, but a Persian paper with an English title is an ordinary
-- thing and the practice should be able to say which it is.
--
-- Page count is null when it could not be read. PDFs that keep their page tree
-- in a compressed object stream defeat a naive scan, and a wrong number on
-- screen is worse than no number, so the card simply omits it.

alter table article
  add column if not exists language text not null default 'fa'
    check (language in ('fa', 'en'));

alter table article
  add column if not exists page_count integer;

-- Backfill from the script the title is written in, which is right for every
-- paper published so far.
update article set language = 'en' where title ~ '^[A-Za-z]';
