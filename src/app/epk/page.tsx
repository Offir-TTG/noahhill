import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight, AtSign, Download, FileDown, Mail, MapPin, Music2,
  Play, Quote,
} from "lucide-react";
import CoverPlayer from "../cover-player";
import SongList from "../song-list";
import CopyText from "./copy-text";
import EpkNav from "./epk-nav";
import { createClient } from "@/lib/supabase/server";
import { mergeContent, type SiteContent } from "@/lib/site-content";
import { mergeEpk, type EpkContent, type PressPhoto } from "@/lib/epk-content";
import { formatCount, getSpotifyArtist, type SpotifyArtistStats } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { epk } = await loadAll();
  return {
    title: "Noah Hill Press Kit",
    description: epk.bios.one_line,
    openGraph: {
      title: "Noah Hill Electronic Press Kit",
      description: epk.bios.one_line,
      type: "profile",
    },
    alternates: { canonical: "/epk" },
    robots: { index: true, follow: true },
  };
}

type Song  = { title: string; year: string | null; duration: string | null; audio_url: string | null; cover_url: string | null };
type TourDate = { show_date: string; city: string; venue: string | null; country: string | null; ticket_url: string | null };

async function loadAll() {
  try {
    const supabase = await createClient();
    const [contentRes, songsRes, tourRes] = await Promise.all([
      supabase.from("site_content").select("data").eq("id", 1).maybeSingle(),
      supabase.from("songs").select("*").order("sort_order").order("created_at"),
      supabase.from("tour_dates").select("*").order("sort_order").order("created_at"),
    ]);
    const raw = (contentRes.data?.data ?? null) as (Partial<SiteContent> & { epk?: Partial<EpkContent> }) | null;
    return {
      content: mergeContent(raw),
      epk: mergeEpk(raw?.epk ?? null),
      songs:  (songsRes.data  as Song[]     | null) ?? [],
      tour:   (tourRes.data   as TourDate[] | null) ?? [],
    };
  } catch {
    return { content: mergeContent(null), epk: mergeEpk(null), songs: [], tour: [] };
  }
}

/** The printed kit, if `npm run epk:pdf` has been run. Optional: the page never depends on it. */
export const EPK_PDF = "/noah-hill-epk.pdf";
function pdfExists() {
  try {
    return existsSync(path.join(process.cwd(), "public", "noah-hill-epk.pdf"));
  } catch {
    return false;
  }
}

/**
 * Route display images through Next's optimizer. The press photos and video
 * stills render with a plain <img> (their host is not guaranteed to be in
 * next.config remotePatterns), which would otherwise embed multi-megabyte
 * originals into the printed PDF. Download links keep pointing at the
 * originals, so press still get full resolution.
 */
const OPTIMIZABLE = (u: string) =>
  (u.startsWith("/") && !u.startsWith("//")) || u.includes("/storage/v1/object/public/");
// Next 16 only serves qualities listed in images.qualities, which defaults to
// [75]; anything else is rejected with a 400 and the image renders broken.
const IMAGE_QUALITY = 75;
const PRINT_QUALITY = 50;
function displayUrl(url: string, width = 1080, quality = IMAGE_QUALITY) {
  return OPTIMIZABLE(url)
    ? `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`
    : url;
}

/**
 * Chrome re-encodes every printed image losslessly and ignores srcset when
 * laying out for print, so the only way to keep the PDF small is to serve
 * smaller files. /epk?print=1 does exactly that; the generator prints that URL
 * while the public page keeps full-quality images.
 */
type ImgOpts = { print: boolean };
function photoSrc({ print }: ImgOpts, url: string, screenW: number, printW: number) {
  return print ? displayUrl(url, printW, PRINT_QUALITY) : displayUrl(url, screenW);
}

/** Lowercase, punctuation-free, for comparing stat labels loosely. */
function normaliseLabel(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Supabase Storage honours ?download=<name>; anything else just opens in a tab. */
function downloadUrl(url: string, filename: string) {
  return url.includes("/storage/v1/object/public/")
    ? `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(filename)}`
    : url;
}

/**
 * Press photos are the shoot in /public/images. Cover-art entries carry no file
 * of their own and resolve to the matching song's artwork, so the kit stays in
 * step with whatever the admin has uploaded.
 */
function resolvePhotos(epk: EpkContent, content: SiteContent, songs: Song[]): (PressPhoto & { url: string })[] {
  const coverFor = (title: string) =>
    songs.find((s) => s.title.toLowerCase() === title.toLowerCase())?.cover_url ?? null;

  return epk.photos
    .map((p) => ({
      ...p,
      url: p.url ?? (p.fromSong ? coverFor(p.fromSong) : null) ?? content.hero.photo_url ?? null,
    }))
    .filter((p): p is PressPhoto & { url: string } => Boolean(p.url));
}

export default async function EpkPage(props: PageProps<"/epk">) {
  const print = (await props.searchParams).print === "1";
  const img: ImgOpts = { print };
  const [{ content, epk, songs, tour }, spotify] = await Promise.all([
    loadAll(),
    getSpotifyArtist(),
  ]);
  const photos = resolvePhotos(epk, content, songs);
  const hasPdf = pdfExists();

  const fallbackCover = content.single.cover_url ?? content.hero.photo_url ?? null;
  const songsForList = songs
    .map((s) => ({
      title: s.title,
      year: s.year ?? "",
      duration: s.duration ?? "",
      audio: s.audio_url ?? "",
      cover: s.cover_url ?? fallbackCover,
    }))
    .filter((s) => s.audio);

  return (
    <>
      <EpkNav />
      <Hero content={content} epk={epk} photos={photos} hasPdf={hasPdf} img={img} />
      <Facts epk={epk} />
      <Bio content={content} img={img} />
      <Music content={content} songs={songsForList} img={img} />
      <Press epk={epk} />
      <Numbers content={content} epk={epk} spotify={spotify} />
      <Live tour={tour} epk={epk} />
      <Photos photos={photos} img={img} />
      <Contact epk={epk} content={content} hasPdf={hasPdf} />
      <EpkFooter epk={epk} hasPdf={hasPdf} />
    </>
  );
}

/* ---------- HERO ---------- */
function Hero({
  content, epk, photos, hasPdf, img,
}: {
  content: SiteContent;
  epk: EpkContent;
  photos: (PressPhoto & { url: string })[];
  hasPdf: boolean;
  img: ImgOpts;
}) {
  const photo = content.hero.photo_url ?? "/images/noah-hero.jpeg";

  return (
    <section className="epk-cover relative grain min-h-[92vh] overflow-hidden">
      <div
        className="halo animate-drift"
        style={{ width: 720, height: 720, left: "-12%", top: "8%", background: "radial-gradient(circle, rgba(74,124,133,0.5), transparent 60%)" }}
      />
      <div
        className="halo animate-drift-slow"
        style={{ width: 560, height: 560, right: "-10%", bottom: "-12%", background: "radial-gradient(circle, rgba(200,178,127,0.18), transparent 60%)" }}
      />

      <div className="absolute inset-0">
        <Image
          src={photo}
          alt="Noah Hill"
          fill
          priority
          sizes={img.print ? "828px" : "100vw"}
          quality={img.print ? PRINT_QUALITY : IMAGE_QUALITY}
          className="object-cover object-[75%_25%] opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/88 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-transparent to-[var(--ink)]/60" />
      </div>

      <div className="absolute left-6 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-6 text-[10px] text-cream-dim lg:flex">
        <span className="vert uppercase">press kit · {epk.meta.updated.toLowerCase()}</span>
        <span className="h-24 w-px bg-cream-dim/40" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-6 pb-20 pt-40 sm:px-10">
        <p className="animate-rise mb-6 text-xs uppercase tracking-[0.5em] text-cream-dim">
          {epk.meta.eyebrow}
        </p>

        <h1
          className="animate-rise font-display font-semibold lowercase leading-[0.85] tracking-tight text-cream"
          style={{ animationDelay: "120ms", fontSize: "clamp(3.5rem, 13vw, 11rem)" }}
        >
          {epk.meta.title_line1}
          <br />
          {epk.meta.title_line2}
        </h1>

        <p
          className="animate-rise mt-8 max-w-xl text-lg leading-relaxed text-cream-dim"
          style={{ animationDelay: "200ms" }}
        >
          {epk.meta.positioning}
        </p>

        <div className="animate-rise mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4" style={{ animationDelay: "280ms" }}>
          <a
            href="#music"
            className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-cream px-7 py-4 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-colors hover:bg-gold sm:w-auto"
          >
            <Play className="size-4 fill-ink" />
            listen
          </a>
          {hasPdf && (
            <a
              href={EPK_PDF}
              download="noah-hill-epk.pdf"
              className="no-print group inline-flex w-full items-center justify-center gap-3 rounded-full border border-cream/40 px-7 py-4 text-sm font-medium uppercase tracking-[0.2em] text-cream transition-colors hover:border-cream hover:bg-cream/5 sm:w-auto"
            >
              <FileDown className="size-4" />
              full kit (pdf)
            </a>
          )}
          <a
            href="#photos"
            className="group inline-flex w-full items-center justify-center gap-3 rounded-full border border-cream/15 px-7 py-4 text-sm font-medium uppercase tracking-[0.2em] text-cream-dim transition-colors hover:border-cream/40 hover:text-cream sm:w-auto"
          >
            <Download className="size-4" />
            press photos
          </a>
          <a
            href="#contact"
            className="group inline-flex w-full items-center justify-center gap-3 rounded-full border border-cream/15 px-7 py-4 text-sm font-medium uppercase tracking-[0.2em] text-cream-dim transition-colors hover:border-cream/40 hover:text-cream sm:w-auto"
          >
            booking
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
          <a
            href="#socials"
            className="group inline-flex w-full items-center justify-center gap-3 rounded-full border border-cream/15 px-7 py-4 text-sm font-medium uppercase tracking-[0.2em] text-cream-dim transition-colors hover:border-cream/40 hover:text-cream sm:w-auto"
          >
            <AtSign className="size-4" />
            socials
          </a>
        </div>

        <div className="animate-rise mt-16 flex items-end justify-between gap-6 text-xs text-cream-dim" style={{ animationDelay: "400ms" }}>
          <div className="space-y-1">
            <p className="uppercase tracking-[0.3em]">{content.hero.role}</p>
            <p className="text-cream-dim/70">{content.hero.location}</p>
          </div>
          <p className="hidden text-right uppercase tracking-[0.3em] sm:block">
            {photos.length.toString().padStart(2, "0")} assets ready to download
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- AT A GLANCE ---------- */
function Facts({ epk }: { epk: EpkContent }) {
  return (
    <section className="border-y border-white/5 bg-midnight">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="epk-grid-4 grid grid-cols-2 gap-px bg-white/5 md:grid-cols-4">
          {epk.facts.map((f) => (
            <div key={f.label} className="bg-midnight px-1 py-7 sm:px-4">
              <p className="text-[10px] uppercase tracking-[0.35em] text-cream-dim/70">{f.label}</p>
              <p className="mt-2 text-sm leading-snug text-cream">{f.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 01 · BIOGRAPHY ---------- */
function Bio({ content, img }: { content: SiteContent; img: ImgOpts }) {
  // Single source of truth: the same paragraphs the homepage About section
  // renders, so the kit and the site can never carry different bios.
  const portrait = content.about.portrait_url ?? "/images/noah-hero.jpeg";
  const paragraphs = content.about.bio;
  const longText = paragraphs.join("\n\n");

  return (
    <section id="bio" className="relative scroll-mt-24 bg-ink py-24 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <SectionLabel index="01" title="biography" />

        <div className="epk-split epk-split-4-8 mt-14 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="epk-print-cap relative aspect-[4/5] overflow-hidden rounded-sm">
              <Image
                src={portrait}
                alt="Noah Hill portrait"
                fill
                sizes={img.print ? "384px" : "(min-width: 1024px) 33vw, 90vw"}
                quality={img.print ? PRINT_QUALITY : IMAGE_QUALITY}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
              <div className="absolute inset-0 ring-1 ring-inset ring-cream/10" />
            </div>
            <h2
              className="mt-8 font-display font-semibold lowercase leading-[0.95] text-cream"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              {content.about.tagline_line1}
              <br />
              {content.about.tagline_line2}
            </h2>
          </div>

          <div className="lg:col-span-8">
            <BioBlock label="biography" text={longText}>
              <div className="space-y-4 leading-relaxed text-cream-dim">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </BioBlock>
          </div>
        </div>
      </div>
    </section>
  );
}

function BioBlock({
  label, text, children,
}: {
  label: string; text: string; children: React.ReactNode;
}) {
  return (
    <div className="epk-prose rounded-sm border border-white/10 bg-steel/25 p-6 sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <p className="text-[10px] uppercase tracking-[0.35em] text-cream-dim">{label}</p>
        <CopyText text={text} what={label} />
      </div>
      {children}
    </div>
  );
}

/* ---------- 02 · THE MUSIC ---------- */
const STREAMING_ICONS: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  spotify: SpotifyIcon,
  "apple music": AppleIcon,
  apple: AppleIcon,
  youtube: YoutubeIcon,
  amazon: AmazonIcon,
  tiktok: TiktokIcon,
  instagram: InstagramIcon,
};

function Music({
  content, songs, img,
}: {
  content: SiteContent;
  songs: { title: string; year: string; duration: string; audio: string; cover?: string | null }[];
  img: ImgOpts;
}) {
  const cover = content.single.cover_url ?? "/images/noah-hero.jpeg";
  const audioFromDb = content.single.streaming.find((s) => s.url && /\.(wav|mp3|m4a)$/.test(s.url))?.url;
  const audioSrc = audioFromDb ?? songs[0]?.audio ?? "/music/Hurt Somebody.wav";

  return (
    <section id="music" className="relative grain scroll-mt-24 overflow-hidden bg-midnight py-24 sm:py-36">
      <div
        className="halo animate-drift-slow"
        style={{ width: 600, height: 600, left: "28%", top: "18%", background: "radial-gradient(circle, rgba(74,124,133,0.22), transparent 60%)" }}
      />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-10">
        <SectionLabel index="02" title="the music" />

        <div className="epk-split epk-split-5-7 mt-14 grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="epk-print-cap">
              <CoverPlayer
                src={audioSrc}
                cover={cover}
                alt={`${content.single.title_line1} ${content.single.title_line2} cover art`}
                sizes={img.print ? "384px" : "(min-width: 1024px) 40vw, 90vw"}
                quality={img.print ? PRINT_QUALITY : IMAGE_QUALITY}
              />
            </div>
            <p className="no-print mt-4 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-cream-dim">
              <span className="size-1.5 animate-pulse rounded-full bg-gold" />
              press stream · play in full
            </p>
          </div>

          <div className="lg:col-span-7">
            <p className="text-xs uppercase tracking-[0.4em] text-cream-dim">{content.single.eyebrow}</p>
            <h2
              className="mt-4 font-display font-semibold lowercase leading-[0.9] text-cream"
              style={{ fontSize: "clamp(2.75rem, 6vw, 5rem)" }}
            >
              {content.single.title_line1}
              <br />
              {content.single.title_line2}
            </h2>
            <p className="mt-7 max-w-lg text-base leading-relaxed text-cream-dim">
              {content.single.description}
            </p>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {content.single.streaming.map(({ name, url }) => {
                const Icon = STREAMING_ICONS[name.trim().toLowerCase()] ?? SpotifyIcon;
                return (
                  <a
                    key={name}
                    href={url || "#"}
                    target={url?.startsWith("http") ? "_blank" : undefined}
                    className="group flex items-center justify-between gap-2 rounded-sm border border-cream/15 bg-steel/40 px-3 py-3 text-xs text-cream transition hover:border-cream/40 hover:bg-steel sm:py-2.5"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="size-4 text-cream-dim transition group-hover:text-cream" />
                      <span className="lowercase tracking-wide">{name}</span>
                    </span>
                    <ArrowUpRight className="size-3.5 text-cream-dim opacity-0 transition group-hover:opacity-100" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {songs.length > 0 && (
          <div className="mt-20">
            <div className="flex items-end justify-between gap-6">
              <p className="text-xs uppercase tracking-[0.4em] text-cream-dim">discography</p>
              <p className="hidden text-xs uppercase tracking-[0.3em] text-cream-dim sm:block">
                {songs.length.toString().padStart(2, "0")} tracks
              </p>
            </div>
            <SongList songs={songs} />
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- 03 · PRESS ---------- */
function Press({ epk }: { epk: EpkContent }) {
  const { quotes } = epk;

  return (
    <section id="press" className="relative scroll-mt-24 bg-ink py-24 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <SectionLabel index="03" title="press" />

        {quotes.length === 0 ? (
          <div className="mt-14 border-y border-white/10 py-20 text-center sm:py-24">
            <Quote className="mx-auto size-7 text-cream-dim/40" />
            <h3
              className="mt-6 font-display font-semibold lowercase leading-[0.95] text-cream"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              coverage lands here.
            </h3>
            <p className="mx-auto mt-5 max-w-md leading-relaxed text-cream-dim">
              Reviews, interviews and features are collected on this page as they publish.
              For advance streams, review copies or interview requests, get in touch below.
            </p>
            <a
              href="#contact"
              className="mt-8 inline-flex items-center justify-center gap-3 rounded-full border border-cream/40 px-7 py-3 text-xs font-medium uppercase tracking-[0.2em] text-cream transition hover:border-cream hover:bg-cream/5"
            >
              request press access
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        ) : (
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {quotes.map((q, i) => (
              <figure
                key={i}
                className="flex break-inside-avoid flex-col justify-between rounded-sm border border-white/10 bg-steel/25 p-7 transition hover:border-cream/25 sm:p-9"
              >
                <Quote className="size-5 text-gold/70" />
                <blockquote
                  className="mt-5 font-display leading-snug text-cream"
                  style={{ fontSize: "clamp(1.35rem, 2.2vw, 1.85rem)" }}
                >
                  {q.quote}
                </blockquote>
                <figcaption className="mt-7 border-t border-white/10 pt-5 text-xs uppercase tracking-[0.3em] text-cream-dim">
                  {q.url ? (
                    <a href={q.url} target="_blank" className="inline-flex items-center gap-2 transition hover:text-cream">
                      {q.source}
                      <ArrowUpRight className="size-3" />
                    </a>
                  ) : (
                    q.source
                  )}
                  {q.meta && <span className="block normal-case tracking-[0.2em] text-cream-dim/60">{q.meta}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- BY THE NUMBERS ---------- */
function Numbers({
  content, epk, spotify,
}: {
  content: SiteContent;
  epk: EpkContent;
  spotify: SpotifyArtistStats | null;
}) {
  // A figure with a source is replaced by the live value; if Spotify is
  // unconfigured or down, its static value is used instead so the row never
  // renders a hole.
  const live = (n: EpkContent["numbers"][number]) => {
    if (!spotify) return { value: n.value, note: n.note, isLive: false };
    if (n.source === "spotify_followers") {
      return { value: formatCount(spotify.followers), note: n.note, isLive: true };
    }
    if (n.source === "spotify_popularity") {
      return { value: String(spotify.popularity), note: n.note, isLive: true };
    }
    return { value: n.value, note: n.note, isLive: false };
  };

  // Site stats first (kept current by the admin), then press-only platform numbers.
  const rows = [
    ...content.about.stats.map((s) => ({ value: s.value, label: s.label, note: undefined as string | undefined, isLive: false })),
    ...epk.numbers
      // Exact-match deduping let "followers" and "spotify followers" both
      // render. Treat one label containing the other as the same figure.
      .filter((n) => {
        const key = normaliseLabel(n.label);
        return !content.about.stats.some((s) => {
          const other = normaliseLabel(s.label);
          return other === key || other.includes(key) || key.includes(other);
        });
      })
      .map((n) => ({ label: n.label, ...live(n) }))
      .filter((r) => r.value !== ""),
  ];

  return (
    <section id="numbers" className="border-y border-white/5 bg-midnight py-14">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.4em] text-cream-dim">by the numbers</p>
          {spotify && (
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-cream-dim/70">
              <span className="size-1.5 animate-pulse rounded-full bg-gold" />
              live from spotify
            </p>
          )}
        </div>
        <dl className="epk-grid-5 mt-8 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {rows.map((r, i) => (
            <div key={i} className="border-l border-cream/20 pl-4">
              <dt className="font-display text-3xl text-cream sm:text-4xl">{r.value}</dt>
              <dd className="mt-2 text-[10px] uppercase leading-relaxed tracking-[0.3em] text-cream-dim">
                {r.label}
                {r.note && (
                  <span className="block text-cream-dim/50">
                    {r.note}
                    {r.isLive && <span className="text-gold/70"> · live</span>}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ---------- 04 · LIVE & TECHNICAL ---------- */
function Live({ tour, epk }: { tour: TourDate[]; epk: EpkContent }) {
  const { live } = epk;

  return (
    <section id="live" className="relative grain scroll-mt-24 overflow-hidden bg-midnight py-24 sm:py-36">
      <div
        className="halo animate-drift"
        style={{ width: 600, height: 600, right: "-12%", top: "25%", background: "radial-gradient(circle, rgba(74,124,133,0.18), transparent 60%)" }}
      />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-10">
        <div className="flex items-end justify-between gap-6">
          <SectionLabel index="04" title="live" />
          <p className="hidden text-xs uppercase tracking-[0.3em] text-gold sm:block">{live.availability}</p>
        </div>

        {/* Dates */}
        {tour.length === 0 ? (
          <div className="mt-14 border-y border-white/10 py-16 text-center">
            <p className="text-[10px] uppercase tracking-[0.5em] text-cream-dim">currently</p>
            <h3
              className="mt-4 font-display font-semibold lowercase leading-[0.9] text-cream"
              style={{ fontSize: "clamp(2.25rem, 6vw, 4rem)" }}
            >
              off the road.
            </h3>
            <p className="mx-auto mt-5 max-w-lg leading-relaxed text-cream-dim">{live.availability_note}</p>
          </div>
        ) : (
          <ul className="mt-14 divide-y divide-white/10 border-y border-white/10">
            {tour.map((show, i) => (
              <li key={show.show_date + show.city + i} className="group">
                <a
                  href={show.ticket_url ?? "#"}
                  target={show.ticket_url?.startsWith("http") ? "_blank" : undefined}
                  className="grid grid-cols-12 items-center gap-4 px-2 py-6 transition hover:bg-cream/5"
                >
                  <span className="col-span-3 font-display text-xl tracking-wide text-cream sm:col-span-2">{show.show_date}</span>
                  <span className="col-span-5 font-display text-2xl lowercase text-cream sm:col-span-4 sm:text-3xl">{show.city}</span>
                  <span className="col-span-3 hidden text-sm text-cream-dim sm:block">{show.venue ?? "tbc"}</span>
                  <span className="col-span-1 hidden items-center gap-1 text-xs uppercase tracking-[0.3em] text-cream-dim sm:flex">
                    <MapPin className="size-3" /> {show.country ?? ""}
                  </span>
                  <span className="col-span-4 flex items-center justify-end gap-2 text-xs uppercase tracking-[0.2em] text-cream-dim transition group-hover:text-cream sm:col-span-2">
                    tickets
                    <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

      </div>
    </section>
  );
}

/* ---------- 05 · PRESS PHOTOS ---------- */
function Photos({ photos, img }: { photos: (PressPhoto & { url: string })[]; img: ImgOpts }) {
  if (photos.length === 0) return null;

  const aspect = (o: PressPhoto["orientation"]) =>
    o === "portrait" ? "aspect-[4/5]" : o === "square" ? "aspect-square" : "aspect-[3/2]";

  return (
    <section id="photos" className="relative scroll-mt-24 bg-ink py-24 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="flex items-end justify-between gap-6">
          <SectionLabel index="05" title="press photos" />
          <p className="hidden text-xs uppercase tracking-[0.3em] text-cream-dim sm:block">
            {photos.length.toString().padStart(2, "0")} assets · free for editorial use
          </p>
        </div>

        <div className="epk-photo-grid mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {photos.map((p) => (
            <figure key={p.filename} className="group">
              <div className={`relative ${aspect(p.orientation)} overflow-hidden rounded-sm bg-steel`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoSrc(img, p.url, 828, 384)}
                  alt={p.label}
                  className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-cream/10" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <a
                  href={downloadUrl(p.url, p.filename)}
                  download={p.filename}
                  target="_blank"
                  className="no-print absolute inset-x-4 bottom-4 flex translate-y-2 items-center justify-center gap-2 rounded-full bg-cream px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-ink opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                >
                  <Download className="size-3" />
                  download
                </a>
              </div>
              <figcaption className="mt-3">
                <p className="text-sm lowercase text-cream">{p.label}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-cream-dim/70">{p.credit}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-10 max-w-2xl text-xs leading-relaxed text-cream-dim">
          All images are cleared for editorial use in connection with coverage of Noah Hill.
          Please retain the credit line and do not crop across the artist. For higher-resolution
          files or alternate crops, email press below.
        </p>
      </div>
    </section>
  );
}

const SOCIAL_ICONS: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  tiktok: TiktokIcon,
  spotify: SpotifyIcon,
  apple: AppleIcon,
  "apple music": AppleIcon,
  amazon: AmazonIcon,
};

/* ---------- 06 · CONTACT ---------- */
function Contact({ epk, content, hasPdf }: { epk: EpkContent; content: SiteContent; hasPdf: boolean }) {
  const contacts = epk.contacts;

  return (
    <section id="contact" className="relative scroll-mt-24 bg-ink py-24 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <SectionLabel index="06" title="contact" />

        <h2
          className="mt-12 max-w-3xl font-display font-semibold lowercase leading-[0.95] text-cream"
          style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)" }}
        >
          contact information
        </h2>

        {/* epk-grid-3 pins three print columns; a lone card must not inherit that. */}
        <div className={`mt-14 grid gap-4 ${contacts.length > 1 ? "epk-grid-3 md:grid-cols-3" : "max-w-sm"}`}>
          {contacts.map((c) => (
            <a
              key={c.role}
              href={`mailto:${c.email}`}
              className="group flex flex-col justify-between rounded-sm border border-white/10 bg-steel/25 p-7 transition hover:border-cream/30 hover:bg-steel/50"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-cream-dim">{c.role}</p>
                <p className="mt-4 break-all font-display text-xl text-cream transition group-hover:text-gold">
                  {c.email}
                </p>
              </div>
              <p className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs leading-relaxed text-cream-dim">
                {c.note}
                <Mail className="size-3.5 shrink-0 opacity-50 transition group-hover:opacity-100" />
              </p>
            </a>
          ))}
        </div>

        <div id="socials" className="mt-10 scroll-mt-28">
          <span className="text-[10px] uppercase tracking-[0.35em] text-cream-dim">socials</span>

          <div className="mt-3 flex flex-wrap items-center gap-3">
          {content.footer.socials.map(({ name, url }) => {
            const Icon = SOCIAL_ICONS[name.trim().toLowerCase()] ?? InstagramIcon;
            return (
              <a
                key={name}
                href={url || "#"}
                target={url?.startsWith("http") ? "_blank" : undefined}
                aria-label={name}
                title={name}
                className="flex size-11 items-center justify-center rounded-full border border-cream/15 text-cream-dim transition hover:border-cream/50 hover:bg-cream/5 hover:text-cream"
              >
                <Icon className="size-4" />
              </a>
            );
          })}
          </div>
        </div>

        {hasPdf && (
          <a
            href={EPK_PDF}
            download="noah-hill-epk.pdf"
            className="no-print mt-12 inline-flex items-center gap-3 rounded-full bg-cream px-7 py-4 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-colors hover:bg-gold"
          >
            <FileDown className="size-4" />
            download the full press kit
          </a>
        )}
      </div>
    </section>
  );
}

/* ---------- FOOTER ---------- */
function EpkFooter({ epk, hasPdf }: { epk: EpkContent; hasPdf: boolean }) {
  return (
    <footer className="border-t border-white/5 bg-ink">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
          <div>
            <p className="font-display text-2xl lowercase text-cream">noah hill</p>
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-cream-dim">
              electronic press kit · {epk.meta.updated}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            {hasPdf && (
              <a
                href={EPK_PDF}
                download="noah-hill-epk.pdf"
                className="no-print group inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-cream-dim transition hover:text-cream"
              >
                <FileDown className="size-3.5" />
                pdf version
              </a>
            )}
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-cream-dim transition hover:text-cream"
            >
              noahill.com
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-white/5 pt-6 text-[11px] uppercase tracking-[0.3em] text-cream-dim/70 sm:flex-row">
          <p>© 2026 noah hill · all rights reserved</p>
          <p className="flex items-center gap-2">
            <Music2 className="size-3" /> assets cleared for editorial use
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ---------- SHARED ---------- */
function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <div className="epk-section-label flex items-center gap-6">
      <span className="font-display text-sm tracking-[0.3em] text-cream-dim">{index}</span>
      <span className="h-px max-w-16 flex-1 bg-cream-dim/30" />
      <span className="text-xs uppercase tracking-[0.4em] text-cream-dim">{title}</span>
    </div>
  );
}

/* ---------- INLINE BRAND ICONS ---------- */
function SpotifyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.43a.62.62 0 0 1-.86.21c-2.36-1.44-5.33-1.77-8.83-.97a.62.62 0 0 1-.28-1.22c3.83-.88 7.12-.5 9.76 1.12.3.18.39.57.21.86Zm1.23-2.74a.78.78 0 0 1-1.07.26c-2.7-1.66-6.82-2.14-10.02-1.17a.78.78 0 1 1-.45-1.49c3.66-1.11 8.2-.57 11.3 1.33.37.23.49.71.24 1.07Zm.1-2.85c-3.24-1.92-8.59-2.1-11.69-1.16a.94.94 0 1 1-.55-1.79c3.56-1.08 9.47-.87 13.2 1.34.45.27.6.85.33 1.3a.94.94 0 0 1-1.29.31Z" />
    </svg>
  );
}
function AppleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.36 12.7c-.02-2.4 1.96-3.55 2.05-3.61-1.12-1.64-2.86-1.86-3.48-1.89-1.48-.15-2.89.87-3.65.87-.76 0-1.91-.85-3.14-.83-1.62.02-3.11.94-3.94 2.39-1.68 2.91-.43 7.22 1.21 9.58.8 1.16 1.75 2.45 3 2.41 1.21-.05 1.66-.78 3.12-.78 1.46 0 1.86.78 3.13.76 1.29-.02 2.11-1.18 2.9-2.34.91-1.34 1.29-2.64 1.31-2.71-.03-.01-2.51-.96-2.51-3.85ZM14.18 5.4c.66-.81 1.11-1.93.99-3.05-.96.04-2.13.64-2.81 1.45-.62.71-1.16 1.86-1.02 2.95 1.07.08 2.18-.55 2.84-1.35Z" />
    </svg>
  );
}
function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.5 6.2c-.3-1-1-1.8-2-2C19.5 3.7 12 3.7 12 3.7s-7.5 0-9.5.5c-1 .3-1.7 1-2 2C0 8.2 0 12 0 12s0 3.8.5 5.8c.3 1 1 1.8 2 2 2 .5 9.5.5 9.5.5s7.5 0 9.5-.5c1-.3 1.7-1 2-2 .5-2 .5-5.8.5-5.8s0-3.8-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
    </svg>
  );
}
function AmazonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M14.86 13.5c-1.79 1.32-4.39 2.02-6.62 2.02-3.13 0-5.96-1.16-8.1-3.08-.17-.15-.02-.36.18-.24 2.31 1.34 5.16 2.15 8.1 2.15 1.99 0 4.18-.41 6.2-1.27.3-.13.55.2.24.42Zm.74-.85c-.23-.29-1.51-.14-2.09-.07-.17.02-.2-.13-.04-.24 1.02-.72 2.7-.51 2.89-.27.2.24-.05 1.93-1.01 2.74-.15.13-.29.06-.22-.1.21-.55.7-1.77.47-2.06ZM12.65 1.5c-3.83 0-6.95 2.49-6.95 5.55 0 3.06 2.31 5.06 5.69 4.95.3-.06 1.05-.07 1.83-.21l.36-.07c.07.04.13.1.13.18 0 .42-2.04 1.7-3.36 1.7-1.61 0-2.93-.74-3.71-2.04-.06-.1-.18-.04-.13.07.86 2.05 2.94 3.07 5.31 3.07 3.45 0 6.62-2.16 6.62-5.66 0-3.41-2.42-5.54-5.79-5.54Zm0 8.6c-1.51 0-2.61-1.4-2.61-3.13s1.1-3.13 2.61-3.13c1.51 0 2.61 1.4 2.61 3.13s-1.1 3.13-2.61 3.13Z" />
    </svg>
  );
}
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function TiktokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.6 7.3a5.7 5.7 0 0 1-3.4-1.1 5.6 5.6 0 0 1-2.2-3.7H10v12.4a2.7 2.7 0 1 1-2.7-2.7c.27 0 .54.04.79.12V8.1a6.7 6.7 0 1 0 5.91 6.65V9.9a8.6 8.6 0 0 0 5 1.6V7.3h.6Z" />
    </svg>
  );
}
