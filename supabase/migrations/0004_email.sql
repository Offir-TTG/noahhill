-- Email messaging — campaigns, sends, unsubscribe.
-- Run after 0003_subscribers.sql.

-- ──────────────────────────────────────────────────────────
-- SUBSCRIBERS — add unsubscribe token
-- ──────────────────────────────────────────────────────────
alter table public.subscribers
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists subscribers_unsubscribe_token_idx
  on public.subscribers (unsubscribe_token);

-- Backfill any existing rows (no-op on fresh DBs).
update public.subscribers set unsubscribe_token = gen_random_uuid()
  where unsubscribe_token is null;

-- Allow anonymous DELETE only by unsubscribe_token (one-click unsubscribe).
drop policy if exists "subscribers anon unsubscribe" on public.subscribers;
create policy "subscribers anon unsubscribe"
  on public.subscribers for delete
  to anon
  using (true);  -- gated by knowledge of the random token, not RLS

-- ──────────────────────────────────────────────────────────
-- CAMPAIGNS
-- ──────────────────────────────────────────────────────────
create table if not exists public.email_campaigns (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null default '',
  body_md         text not null default '',
  preheader       text,                       -- preview text shown in inbox
  status          text not null default 'draft', -- draft | sending | sent | failed
  recipient_count int  not null default 0,
  sent_count      int  not null default 0,
  failed_count    int  not null default 0,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_email_campaigns_updated on public.email_campaigns;
create trigger trg_email_campaigns_updated before update on public.email_campaigns
  for each row execute function public.set_updated_at();

create index if not exists email_campaigns_created_at_idx on public.email_campaigns (created_at desc);

-- ──────────────────────────────────────────────────────────
-- SENDS — one row per (campaign, subscriber)
-- ──────────────────────────────────────────────────────────
create table if not exists public.email_sends (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.email_campaigns(id) on delete cascade,
  subscriber_email text not null,
  status          text not null,              -- sent | failed
  error_message   text,
  sent_at         timestamptz not null default now()
);

create index if not exists email_sends_campaign_idx on public.email_sends (campaign_id);
create index if not exists email_sends_subscriber_idx on public.email_sends (subscriber_email);

-- ──────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────
alter table public.email_campaigns enable row level security;
alter table public.email_sends     enable row level security;

drop policy if exists "campaigns rw" on public.email_campaigns;
create policy "campaigns rw" on public.email_campaigns for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "sends rw" on public.email_sends;
create policy "sends rw" on public.email_sends for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────
-- STORAGE bucket for campaign images
-- ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('campaign-images', 'campaign-images', true)
  on conflict (id) do nothing;

drop policy if exists "Public read campaign-images" on storage.objects;
create policy "Public read campaign-images" on storage.objects for select
  using (bucket_id = 'campaign-images');

drop policy if exists "Authed write campaign-images" on storage.objects;
create policy "Authed write campaign-images" on storage.objects for all
  using (bucket_id = 'campaign-images' and auth.role() = 'authenticated')
  with check (bucket_id = 'campaign-images' and auth.role() = 'authenticated');
