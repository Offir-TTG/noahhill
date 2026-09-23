-- Noah Hill artist site — initial schema
-- Run this once in Supabase Studio: SQL Editor → paste → Run.

-- ──────────────────────────────────────────────────────────
-- TABLES
-- ──────────────────────────────────────────────────────────

-- Single-row JSONB blob holding all section copy (hero, marquee, single, about, newsletter, footer).
create table if not exists public.site_content (
  id          int primary key default 1,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.site_content (id, data) values (1, '{}'::jsonb)
  on conflict (id) do nothing;

-- Songs / discography
create table if not exists public.songs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  year        text,
  duration    text,
  audio_url   text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Music videos
create table if not exists public.videos (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  year          text,
  duration      text,
  thumbnail_url text,
  video_url     text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Tour dates
create table if not exists public.tour_dates (
  id           uuid primary key default gen_random_uuid(),
  show_date    text not null,                 -- e.g. "MAY 18" — kept as text so the artist can format freely
  city         text not null,
  venue        text,
  country      text,
  ticket_url   text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_site_content_updated on public.site_content;
create trigger trg_site_content_updated before update on public.site_content
  for each row execute function public.set_updated_at();

drop trigger if exists trg_songs_updated on public.songs;
create trigger trg_songs_updated before update on public.songs
  for each row execute function public.set_updated_at();

drop trigger if exists trg_videos_updated on public.videos;
create trigger trg_videos_updated before update on public.videos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tour_dates_updated on public.tour_dates;
create trigger trg_tour_dates_updated before update on public.tour_dates
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Public read, authenticated write.
-- ──────────────────────────────────────────────────────────
alter table public.site_content enable row level security;
alter table public.songs        enable row level security;
alter table public.videos       enable row level security;
alter table public.tour_dates   enable row level security;

-- site_content
drop policy if exists "site_content read"  on public.site_content;
drop policy if exists "site_content write" on public.site_content;
create policy "site_content read"  on public.site_content for select using (true);
create policy "site_content write" on public.site_content for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- songs
drop policy if exists "songs read"  on public.songs;
drop policy if exists "songs write" on public.songs;
create policy "songs read"  on public.songs for select using (true);
create policy "songs write" on public.songs for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- videos
drop policy if exists "videos read"  on public.videos;
drop policy if exists "videos write" on public.videos;
create policy "videos read"  on public.videos for select using (true);
create policy "videos write" on public.videos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- tour_dates
drop policy if exists "tour_dates read"  on public.tour_dates;
drop policy if exists "tour_dates write" on public.tour_dates;
create policy "tour_dates read"  on public.tour_dates for select using (true);
create policy "tour_dates write" on public.tour_dates for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────
-- STORAGE BUCKETS
-- ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('images', 'images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('music',  'music',  true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('videos', 'videos', true) on conflict (id) do nothing;

-- Public read on all three buckets
drop policy if exists "Public read images"  on storage.objects;
drop policy if exists "Public read music"   on storage.objects;
drop policy if exists "Public read videos"  on storage.objects;
create policy "Public read images" on storage.objects for select using (bucket_id = 'images');
create policy "Public read music"  on storage.objects for select using (bucket_id = 'music');
create policy "Public read videos" on storage.objects for select using (bucket_id = 'videos');

-- Authenticated write
drop policy if exists "Authed write images" on storage.objects;
drop policy if exists "Authed write music"  on storage.objects;
drop policy if exists "Authed write videos" on storage.objects;
create policy "Authed write images" on storage.objects for all
  using (bucket_id = 'images' and auth.role() = 'authenticated')
  with check (bucket_id = 'images' and auth.role() = 'authenticated');
create policy "Authed write music" on storage.objects for all
  using (bucket_id = 'music' and auth.role() = 'authenticated')
  with check (bucket_id = 'music' and auth.role() = 'authenticated');
create policy "Authed write videos" on storage.objects for all
  using (bucket_id = 'videos' and auth.role() = 'authenticated')
  with check (bucket_id = 'videos' and auth.role() = 'authenticated');
