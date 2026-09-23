-- Seed Noah Hill site content with the current hardcoded values.
-- Run AFTER 0001_init.sql.
-- Idempotent: running it twice will not create duplicates.

-- ──────────────────────────────────────────────────────────
-- SITE CONTENT (single JSONB row)
-- ──────────────────────────────────────────────────────────
update public.site_content
set data = jsonb_build_object(
  'hero', jsonb_build_object(
    'eyebrow',     'new single · hurt somebody · out now',
    'name_line1',  'noah',
    'name_line2',  'hill',
    'photo_url',   '/images/noah-hero.jpeg',
    'side_label',  'est · 2026',
    'role',        'singer · songwriter · producer',
    'location',    'based in new york'
  ),
  'marquee', jsonb_build_object(
    'items', jsonb_build_array('hurt somebody', 'out now', 'noah hill', 'new single', 'world tour 2026')
  ),
  'single', jsonb_build_object(
    'eyebrow',     'single · 2026',
    'title_line1', 'hurt',
    'title_line2', 'somebody',
    'description', 'A late-night confession dressed in hushed drums and warm tape saturation — recorded between Tel Aviv and a small studio in East London. The first taste of what''s coming.',
    'cover_url',   '/images/noah-hero.jpeg',
    'streaming',   jsonb_build_array(
      jsonb_build_object('name', 'Spotify',     'url', '#'),
      jsonb_build_object('name', 'Apple Music', 'url', '#'),
      jsonb_build_object('name', 'YouTube',     'url', '#'),
      jsonb_build_object('name', 'Amazon',      'url', '#')
    )
  ),
  'about', jsonb_build_object(
    'tagline_line1', 'quiet songs',
    'tagline_line2', 'for loud nights.',
    'bio', jsonb_build_array(
      'Noah Hill writes the kind of songs that sit inside a room with you — close, unhurried, and honest. Self-taught on a borrowed guitar at fourteen, he started uploading bedroom demos at sixteen and built a quiet but devoted following one listener at a time.',
      'His debut single "hurt somebody" arrived as a meditation on the small cruelties we don''t talk about. A debut EP follows later this year.'
    ),
    'portrait_url', '/images/noah-hero.jpeg',
    'stats', jsonb_build_array(
      jsonb_build_object('value', '2.4M', 'label', 'monthly listeners'),
      jsonb_build_object('value', '12',   'label', 'cities · 2026'),
      jsonb_build_object('value', '08',   'label', 'songs · debut EP')
    )
  ),
  'newsletter', jsonb_build_object(
    'eyebrow', 'stay close',
    'heading', 'new music. early.',
    'copy',    'Pre-saves, unreleased demos, ticket pre-sales — sent rarely, never spammy.'
  ),
  'footer', jsonb_build_object(
    'management_email', 'management@noahhillmusic.com',
    'press_email',      'press@noahhillmusic.com',
    'socials', jsonb_build_array(
      jsonb_build_object('name', 'Instagram',   'url', '#'),
      jsonb_build_object('name', 'YouTube',     'url', '#'),
      jsonb_build_object('name', 'TikTok',      'url', '#'),
      jsonb_build_object('name', 'Spotify',     'url', '#'),
      jsonb_build_object('name', 'Apple Music', 'url', '#')
    )
  )
)
where id = 1;

-- ──────────────────────────────────────────────────────────
-- SONGS — references the .wav files already in /public/music
-- ──────────────────────────────────────────────────────────
insert into public.songs (title, year, duration, audio_url, sort_order)
select * from (values
  ('hurt somebody', '2026', '3:42', '/music/Hurt Somebody.wav', 0),
  ('fix me',        '2025', '3:18', '/music/Fix Me.wav',        1)
) as v(title, year, duration, audio_url, sort_order)
where not exists (
  select 1 from public.songs s where s.title = v.title
);

-- ──────────────────────────────────────────────────────────
-- TOUR DATES
-- ──────────────────────────────────────────────────────────
insert into public.tour_dates (show_date, city, venue, country, ticket_url, sort_order)
select * from (values
  ('MAY 18', 'New York',    'Music Hall of Williamsburg', 'US', null::text, 0),
  ('JUN 02', 'Berlin',      'Festsaal Kreuzberg',         'DE', null::text, 1),
  ('JUN 06', 'Amsterdam',   'Paradiso',                   'NL', null::text, 2),
  ('JUN 11', 'London',      'Omeara',                     'UK', null::text, 3),
  ('JUN 14', 'Paris',       'La Maroquinerie',            'FR', null::text, 4),
  ('JUL 08', 'Los Angeles', 'The Roxy',                   'US', null::text, 5)
) as v(show_date, city, venue, country, ticket_url, sort_order)
where not exists (
  select 1 from public.tour_dates t where t.show_date = v.show_date and t.city = v.city
);

-- ──────────────────────────────────────────────────────────
-- VIDEOS
-- ──────────────────────────────────────────────────────────
insert into public.videos (title, year, duration, thumbnail_url, video_url, sort_order)
select * from (values
  ('hurt somebody',  '2026', '3:42', '/images/noah-hero.jpeg', null::text, 0),
  ('low light',      '2025', '4:08', null::text,               null::text, 1),
  ('out of nowhere', '2025', '3:21', null::text,               null::text, 2)
) as v(title, year, duration, thumbnail_url, video_url, sort_order)
where not exists (
  select 1 from public.videos vv where vv.title = v.title
);
