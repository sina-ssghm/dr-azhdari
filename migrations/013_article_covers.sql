-- Cover images for articles.
--
-- The covers are tall portrait cards that carry the paper's title inside the
-- artwork, so where one exists the card shows the image instead of repeating
-- the title in text. Nullable: an article without a cover still lists, it just
-- falls back to the text card.

alter table article
  add column if not exists cover_name text;
