-- Downloadable articles.
--
-- These are papers the practice publishes as PDFs: a title, a line or two of
-- description, and a file. No cover images and no article bodies — the PDF is
-- the content, and the page is a list of things to download.
--
-- The files live on the same host volume pattern as receipts, but under their
-- own directory and served without authentication: a receipt is a private
-- financial document, a published paper is the opposite.

create table if not exists article (
  id          integer     primary key generated always as identity,
  title       text        not null,
  description text,
  -- Stored filename only, never a path. The original name is kept so the
  -- download arrives called something meaningful rather than a uuid.
  file_name   text        not null,
  origin_name text        not null,
  file_size   integer     not null,
  -- Lets a paper be taken off the list without deleting the file.
  published   boolean     not null default true,
  -- Explicit, so the practice can order the list rather than being stuck with
  -- whatever order the uploads happened in.
  position    integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists article_published_idx
  on article (published, position, id);
