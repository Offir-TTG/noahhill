-- Subscribers — newsletter signups from the public site.
-- Run after 0001_init.sql.

create table if not exists public.subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  source      text not null default 'newsletter',
  created_at  timestamptz not null default now()
);

create index if not exists subscribers_created_at_idx on public.subscribers (created_at desc);

alter table public.subscribers enable row level security;

-- ANYONE can subscribe (insert).
drop policy if exists "subscribers insert" on public.subscribers;
create policy "subscribers insert"
  on public.subscribers for insert
  to anon, authenticated
  with check (true);

-- Only the admin (authenticated users) can read the list.
drop policy if exists "subscribers read" on public.subscribers;
create policy "subscribers read"
  on public.subscribers for select
  using (auth.role() = 'authenticated');

-- Only the admin can delete.
drop policy if exists "subscribers delete" on public.subscribers;
create policy "subscribers delete"
  on public.subscribers for delete
  using (auth.role() = 'authenticated');
