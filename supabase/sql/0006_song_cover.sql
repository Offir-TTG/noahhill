-- Add cover art per song so the public discography can render a 3D vinyl
-- with the song's own artwork in the center label.

alter table public.songs
  add column if not exists cover_url text;
