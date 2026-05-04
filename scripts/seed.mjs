/**
 * Noah Hill site seed.
 *
 * What it does:
 *   1. Uploads /public/images/noah-hero.jpeg     → Supabase Storage `images` bucket
 *   2. Uploads /public/music/Hurt Somebody.wav  → Supabase Storage `music`  bucket
 *   3. Uploads /public/music/Fix Me.wav         → Supabase Storage `music`  bucket
 *   4. Upserts the site_content JSON with current copy + uploaded image URLs
 *   5. Inserts songs, videos, and tour_dates rows with the uploaded URLs
 *
 * Idempotent: re-running will not create duplicates (uses unique title checks).
 *
 * Run:  npm run seed
 *
 * Requires: 0001_init.sql already run in Supabase (tables + buckets exist).
 */

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── Load .env.local manually (Node has built-in --env-file but we want zero-flag run)
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, "..");

async function loadEnv() {
  try {
    const raw = await readFile(path.join(ROOT, ".env.local"), "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      const [, k, v] = m;
      if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, "");
    }
  } catch (e) {
    console.error("Could not read .env.local:", e.message);
    process.exit(1);
  }
}

await loadEnv();

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

// Admin client — bypasses RLS.
const sb = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const log = (...args) => console.log("→", ...args);
const ok  = (msg)     => console.log("✓", msg);

// ── Storage upload helper
async function uploadIfMissing(bucket, localPath, storagePath, contentType) {
  const buf = await readFile(localPath);
  // Check if already there
  const folder = path.posix.dirname(storagePath);
  const name   = path.posix.basename(storagePath);
  const { data: list } = await sb.storage.from(bucket).list(folder === "." ? "" : folder, { search: name });
  if (list?.some((f) => f.name === name)) {
    log(`storage/${bucket}/${storagePath} already exists — skipping upload`);
  } else {
    const { error } = await sb.storage.from(bucket).upload(storagePath, buf, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error(`Upload failed [${bucket}/${storagePath}]: ${error.message}`);
    ok(`uploaded ${bucket}/${storagePath}`);
  }
  return sb.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
}

// ── Run
async function main() {
  log("starting seed");

  // 1. Files
  const heroUrl = await uploadIfMissing(
    "images",
    path.join(ROOT, "public/images/noah-hero.jpeg"),
    "noah-hero.jpeg",
    "image/jpeg",
  );
  const hurtUrl = await uploadIfMissing(
    "music",
    path.join(ROOT, "public/music/Hurt Somebody.wav"),
    "hurt-somebody.wav",
    "audio/wav",
  );
  const fixUrl = await uploadIfMissing(
    "music",
    path.join(ROOT, "public/music/Fix Me.wav"),
    "fix-me.wav",
    "audio/wav",
  );

  // 2. site_content
  const content = {
    hero: {
      eyebrow: "new single · hurt somebody · out now",
      name_line1: "noah",
      name_line2: "hill",
      photo_url: heroUrl,
      side_label: "est · 2026",
      role: "singer · songwriter · producer",
      location: "based in new york",
    },
    marquee: {
      items: ["hurt somebody", "out now", "noah hill", "new single", "world tour 2026"],
    },
    single: {
      eyebrow: "single · 2026",
      title_line1: "hurt",
      title_line2: "somebody",
      description:
        "A late-night confession dressed in hushed drums and warm tape saturation — recorded between Tel Aviv and a small studio in East London. The first taste of what's coming.",
      cover_url: heroUrl,
      streaming: [
        { name: "Spotify",     url: "#" },
        { name: "Apple Music", url: "#" },
        { name: "YouTube",     url: "#" },
        { name: "Amazon",      url: "#" },
      ],
    },
    about: {
      tagline_line1: "quiet songs",
      tagline_line2: "for loud nights.",
      bio: [
        "Noah Hill writes the kind of songs that sit inside a room with you — close, unhurried, and honest. Self-taught on a borrowed guitar at fourteen, he started uploading bedroom demos at sixteen and built a quiet but devoted following one listener at a time.",
        'His debut single "hurt somebody" arrived as a meditation on the small cruelties we don\'t talk about. A debut EP follows later this year.',
      ],
      portrait_url: heroUrl,
      stats: [
        { value: "2.4M", label: "monthly listeners" },
        { value: "12",   label: "cities · 2026" },
        { value: "08",   label: "songs · debut EP" },
      ],
    },
    newsletter: {
      eyebrow: "stay close",
      heading: "new music. early.",
      copy: "Pre-saves, unreleased demos, ticket pre-sales — sent rarely, never spammy.",
    },
    footer: {
      management_email: "management@noahhillmusic.com",
      press_email: "press@noahhillmusic.com",
      socials: [
        { name: "Instagram",   url: "#" },
        { name: "YouTube",     url: "#" },
        { name: "TikTok",      url: "#" },
        { name: "Spotify",     url: "#" },
        { name: "Apple Music", url: "#" },
      ],
    },
  };

  {
    const { error } = await sb.from("site_content").upsert({ id: 1, data: content }, { onConflict: "id" });
    if (error) throw new Error(`site_content: ${error.message}`);
    ok("site_content saved");
  }

  // 3. Songs (skip if title already there)
  const songs = [
    { title: "hurt somebody", year: "2026", duration: "3:42", audio_url: hurtUrl, sort_order: 0 },
    { title: "fix me",        year: "2025", duration: "3:18", audio_url: fixUrl,  sort_order: 1 },
  ];
  for (const s of songs) {
    const { data: existing } = await sb.from("songs").select("id").eq("title", s.title).maybeSingle();
    if (existing) {
      // Refresh URL/metadata in case it changed
      const { error } = await sb.from("songs").update(s).eq("id", existing.id);
      if (error) throw new Error(`songs update: ${error.message}`);
      ok(`updated song "${s.title}"`);
    } else {
      const { error } = await sb.from("songs").insert(s);
      if (error) throw new Error(`songs insert: ${error.message}`);
      ok(`inserted song "${s.title}"`);
    }
  }

  // 4. Tour dates
  const tour = [
    { show_date: "MAY 18", city: "New York",    venue: "Music Hall of Williamsburg", country: "US", sort_order: 0 },
    { show_date: "JUN 02", city: "Berlin",      venue: "Festsaal Kreuzberg",         country: "DE", sort_order: 1 },
    { show_date: "JUN 06", city: "Amsterdam",   venue: "Paradiso",                   country: "NL", sort_order: 2 },
    { show_date: "JUN 11", city: "London",      venue: "Omeara",                     country: "UK", sort_order: 3 },
    { show_date: "JUN 14", city: "Paris",       venue: "La Maroquinerie",            country: "FR", sort_order: 4 },
    { show_date: "JUL 08", city: "Los Angeles", venue: "The Roxy",                   country: "US", sort_order: 5 },
  ];
  for (const t of tour) {
    const { data: existing } = await sb
      .from("tour_dates").select("id")
      .eq("show_date", t.show_date).eq("city", t.city)
      .maybeSingle();
    if (!existing) {
      const { error } = await sb.from("tour_dates").insert(t);
      if (error) throw new Error(`tour_dates insert: ${error.message}`);
      ok(`inserted show ${t.show_date} ${t.city}`);
    }
  }

  // 5. Videos
  const videos = [
    { title: "hurt somebody",  year: "2026", duration: "3:42", thumbnail_url: heroUrl, video_url: null, sort_order: 0 },
    { title: "low light",      year: "2025", duration: "4:08", thumbnail_url: null,    video_url: null, sort_order: 1 },
    { title: "out of nowhere", year: "2025", duration: "3:21", thumbnail_url: null,    video_url: null, sort_order: 2 },
  ];
  for (const v of videos) {
    const { data: existing } = await sb.from("videos").select("id").eq("title", v.title).maybeSingle();
    if (!existing) {
      const { error } = await sb.from("videos").insert(v);
      if (error) throw new Error(`videos insert: ${error.message}`);
      ok(`inserted video "${v.title}"`);
    }
  }

  console.log("\n🎉 seed complete — open /admin to see the data.");
}

main().catch((e) => {
  console.error("\n✗ seed failed:", e.message);
  process.exit(1);
});
