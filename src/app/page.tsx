import Image from "next/image";
import { Music2, Play, ArrowUpRight, MapPin } from "lucide-react";
import CoverPlayer from "./cover-player";
import SongList from "./song-list";
import Nav from "./nav";
import SubscribeForm from "./subscribe-form";
import { createClient } from "@/lib/supabase/server";
import { mergeContent, type SiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

type Song = { id?: string; title: string; year?: string | null; duration?: string | null; audio_url?: string | null };
type Video = { title: string; year: string | null; duration: string | null; thumbnail_url: string | null; video_url: string | null };
type TourDate = { show_date: string; city: string; venue: string | null; country: string | null; ticket_url: string | null };

const FALLBACK_SONGS: Song[] = [
  { title: "hurt somebody", year: "2026", duration: "3:42", audio_url: "/music/Hurt Somebody.wav" },
  { title: "fix me",        year: "2025", duration: "3:18", audio_url: "/music/Fix Me.wav" },
];

const FALLBACK_VIDEOS: Video[] = [
  { title: "hurt somebody",  year: "2026", duration: "3:42", thumbnail_url: null, video_url: null },
  { title: "low light",      year: "2025", duration: "4:08", thumbnail_url: null, video_url: null },
  { title: "out of nowhere", year: "2025", duration: "3:21", thumbnail_url: null, video_url: null },
];

const FALLBACK_TOUR: TourDate[] = [
  { show_date: "MAY 18", city: "New York",   venue: "Music Hall of Williamsburg", country: "US", ticket_url: null },
  { show_date: "JUN 02", city: "Berlin",     venue: "Festsaal Kreuzberg",         country: "DE", ticket_url: null },
  { show_date: "JUN 06", city: "Amsterdam",  venue: "Paradiso",                   country: "NL", ticket_url: null },
  { show_date: "JUN 11", city: "London",     venue: "Omeara",                     country: "UK", ticket_url: null },
  { show_date: "JUN 14", city: "Paris",      venue: "La Maroquinerie",            country: "FR", ticket_url: null },
  { show_date: "JUL 08", city: "Los Angeles",venue: "The Roxy",                   country: "US", ticket_url: null },
];

async function loadAll() {
  try {
    const supabase = await createClient();
    const [contentRes, songsRes, videosRes, tourRes] = await Promise.all([
      supabase.from("site_content").select("data").eq("id", 1).maybeSingle(),
      supabase.from("songs").select("*").order("sort_order").order("created_at"),
      supabase.from("videos").select("*").order("sort_order").order("created_at"),
      supabase.from("tour_dates").select("*").order("sort_order").order("created_at"),
    ]);

    return {
      content: mergeContent((contentRes.data?.data ?? null) as Partial<SiteContent> | null),
      songs:  (songsRes.data  as Song[]     | null) ?? FALLBACK_SONGS,
      videos: (videosRes.data as Video[]    | null) ?? FALLBACK_VIDEOS,
      tour:   (tourRes.data   as TourDate[] | null) ?? FALLBACK_TOUR,
    };
  } catch {
    return {
      content: mergeContent(null),
      songs: FALLBACK_SONGS,
      videos: FALLBACK_VIDEOS,
      tour: FALLBACK_TOUR,
    };
  }
}

export default async function Home() {
  const { content, songs, videos, tour } = await loadAll();
  const songsForList = songs.map((s) => ({
    title: s.title,
    year: s.year ?? "",
    duration: s.duration ?? "",
    audio: s.audio_url ?? "",
  })).filter((s) => s.audio);

  return (
    <>
      <Nav />
      <Hero content={content} />
      <Marquee items={content.marquee.items} />
      <LatestRelease content={content} />
      <Discography songs={songsForList} />
      <Videos videos={videos.length ? videos : FALLBACK_VIDEOS} fallbackImg={content.hero.photo_url ?? "/images/noah-hero.jpeg"} />
      <Tour rows={tour} />
      <About content={content} />
      <Newsletter content={content} />
      <Footer content={content} />
    </>
  );
}

/* ---------- HERO ---------- */
function Hero({ content }: { content: SiteContent }) {
  const photo = content.hero.photo_url ?? "/images/noah-hero.jpeg";
  return (
    <section id="top" className="relative grain min-h-screen overflow-hidden">
      <div className="halo animate-drift" style={{ width: 720, height: 720, left: "-10%", top: "10%", background: "radial-gradient(circle, rgba(74,124,133,0.55), transparent 60%)" }} />
      <div className="halo animate-drift-slow" style={{ width: 540, height: 540, right: "-8%", bottom: "-10%", background: "radial-gradient(circle, rgba(200,178,127,0.18), transparent 60%)" }} />

      <div className="absolute inset-0">
        <Image src={photo} alt="Noah Hill" fill priority sizes="100vw" className="object-cover object-[75%_25%] opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-transparent to-transparent" />
      </div>

      <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-6 text-[10px] text-cream-dim">
        <span className="vert uppercase">{content.hero.side_label}</span>
        <span className="h-24 w-px bg-cream-dim/40" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-6 pb-24 pt-40 sm:px-10">
        <p className="animate-rise text-xs uppercase tracking-[0.5em] text-cream-dim mb-6">
          {content.hero.eyebrow}
        </p>
        <h1 className="animate-rise font-display lowercase font-semibold leading-[0.85] tracking-tight text-cream"
            style={{ animationDelay: "120ms", fontSize: "clamp(4rem, 14vw, 12rem)" }}>
          {content.hero.name_line1}
          <br />
          {content.hero.name_line2}
        </h1>
        <div className="animate-rise mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center" style={{ animationDelay: "260ms" }}>
          <a href="#music" className="group inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-full bg-cream px-7 py-4 text-sm font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition-colors">
            <Play className="size-4 fill-ink" />
            listen now
          </a>
          <a href="#videos" className="group inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-full border border-cream/40 px-7 py-4 text-sm font-medium uppercase tracking-[0.2em] text-cream hover:border-cream hover:bg-cream/5 transition-colors">
            watch video
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        <div className="animate-rise mt-20 flex items-end justify-between text-xs text-cream-dim" style={{ animationDelay: "400ms" }}>
          <div className="space-y-1">
            <p className="uppercase tracking-[0.3em]">{content.hero.role}</p>
            <p className="text-cream-dim/70">{content.hero.location}</p>
          </div>
          <div className="hidden sm:block text-right space-y-1">
            <p className="uppercase tracking-[0.3em]">scroll</p>
            <span className="block ml-auto h-10 w-px bg-cream-dim/40" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- MARQUEE ---------- */
function Marquee({ items }: { items: string[] }) {
  const safe = items.length ? items : ["noah hill"];
  const repeated = [...safe, ...safe];
  return (
    <div className="border-y border-white/5 bg-midnight overflow-hidden py-6">
      <div className="flex w-max animate-marquee gap-12 whitespace-nowrap font-display lowercase text-cream/80 text-3xl sm:text-5xl">
        {repeated.map((t, i) => (
          <span key={i} className="flex items-center gap-12">
            {t}
            <span className="size-2 rounded-full bg-gold/70 inline-block" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- LATEST RELEASE ---------- */
const STREAMING_ICONS: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  spotify:     SpotifyIcon,
  "apple music": AppleIcon,
  apple:       AppleIcon,
  youtube:     YoutubeIcon,
  amazon:      AmazonIcon,
  tiktok:      TiktokIcon,
  instagram:   InstagramIcon,
};

function streamingIcon(name: string) {
  return STREAMING_ICONS[name.trim().toLowerCase()] ?? SpotifyIcon;
}

function LatestRelease({ content }: { content: SiteContent }) {
  const cover = content.single.cover_url ?? "/images/noah-hero.jpeg";
  const audioFromDb = content.single.streaming.find(s => s.url && /\.(wav|mp3|m4a)$/.test(s.url))?.url;
  const audioSrc = audioFromDb ?? "/music/Hurt Somebody.wav";

  return (
    <section id="music" className="relative grain bg-midnight py-28 sm:py-40 overflow-hidden">
      <div className="halo animate-drift-slow" style={{ width: 600, height: 600, left: "30%", top: "20%", background: "radial-gradient(circle, rgba(74,124,133,0.25), transparent 60%)" }} />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-10">
        <SectionLabel index="01" title="latest release" />

        <div className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-20 items-center">
          <div className="lg:col-span-5">
            <CoverPlayer src={audioSrc} cover={cover} alt={`${content.single.title_line1} ${content.single.title_line2} — cover art`} />
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-cream-dim flex items-center gap-3">
              <span className="size-1.5 rounded-full bg-gold animate-pulse" />
              now playing on every platform
            </p>
          </div>

          <div className="lg:col-span-7">
            <p className="text-xs uppercase tracking-[0.4em] text-cream-dim">{content.single.eyebrow}</p>
            <h2 className="mt-4 font-display lowercase font-semibold leading-[0.9] text-cream"
                style={{ fontSize: "clamp(3rem, 7vw, 6rem)" }}>
              {content.single.title_line1}<br/>{content.single.title_line2}
            </h2>
            <p className="mt-8 max-w-lg text-base leading-relaxed text-cream-dim">
              {content.single.description}
            </p>

            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {content.single.streaming.map(({ name, url }) => {
                const Icon = streamingIcon(name);
                return (
                  <a key={name} href={url || "#"} target={url?.startsWith("http") ? "_blank" : undefined}
                     className="group flex items-center justify-between gap-2 rounded-sm border border-cream/15 bg-steel/40 px-3 py-3 sm:py-2.5 text-xs text-cream hover:border-cream/40 hover:bg-steel transition">
                    <span className="flex items-center gap-3">
                      <Icon className="size-4 text-cream-dim group-hover:text-cream transition" />
                      <span className="lowercase tracking-wide">{name}</span>
                    </span>
                    <ArrowUpRight className="size-3.5 text-cream-dim opacity-0 group-hover:opacity-100 transition" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- DISCOGRAPHY ---------- */
function Discography({ songs }: { songs: { title: string; year: string; duration: string; audio: string }[] }) {
  if (songs.length === 0) return null;
  return (
    <section id="songs" className="relative bg-ink py-28 sm:py-40">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="flex items-end justify-between gap-6">
          <SectionLabel index="02" title="all songs" />
          <p className="hidden sm:block text-xs uppercase tracking-[0.3em] text-cream-dim">
            {songs.length.toString().padStart(2, "0")} tracks
          </p>
        </div>
        <SongList songs={songs} />
      </div>
    </section>
  );
}

/* ---------- VIDEOS ---------- */
function Videos({ videos, fallbackImg }: { videos: Video[]; fallbackImg: string }) {
  return (
    <section id="videos" className="relative bg-ink py-28 sm:py-40">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <SectionLabel index="03" title="visuals" />
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {videos.map((v, i) => {
            const thumb = v.thumbnail_url ?? (i === 0 ? fallbackImg : null);
            return (
              <a key={v.title + i} href={v.video_url ?? "#"} target={v.video_url?.startsWith("http") ? "_blank" : undefined}
                 className="group relative aspect-[4/5] overflow-hidden rounded-sm bg-steel">
                {thumb ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={thumb} alt={v.title} className="absolute inset-0 size-full object-cover opacity-80 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100" />
                ) : (
                  <div
                    className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                    style={{ background: i === 1
                        ? "linear-gradient(135deg, #16242c 0%, #2a4751 60%, #4a7c85 100%)"
                        : "linear-gradient(160deg, #0c1419 0%, #16242c 50%, #c8b27f 140%)" }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
                <div className="absolute top-5 right-5 size-12 rounded-full border border-cream/30 backdrop-blur-sm flex items-center justify-center group-hover:bg-cream group-hover:border-cream transition">
                  <Play className="size-4 fill-cream text-cream group-hover:fill-ink group-hover:text-ink transition" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-cream-dim">
                    {v.year ?? "—"} · {v.duration ?? "—"}
                  </p>
                  <h3 className="mt-2 font-display lowercase text-cream text-3xl font-medium">
                    {v.title}
                  </h3>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- TOUR ---------- */
function Tour({ rows }: { rows: TourDate[] }) {
  const isEmpty = rows.length === 0;

  return (
    <section id="tour" className="relative grain bg-midnight py-28 sm:py-40 overflow-hidden">
      <div className="halo animate-drift" style={{ width: 600, height: 600, right: "-10%", top: "30%", background: "radial-gradient(circle, rgba(74,124,133,0.2), transparent 60%)" }} />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-10">
        <div className="flex items-end justify-between gap-6">
          <SectionLabel index="04" title="tours" />
          <p className="hidden sm:block text-xs uppercase tracking-[0.3em] text-cream-dim">
            {isEmpty ? "next dates · soon" : "world tour · 2026"}
          </p>
        </div>

        {isEmpty ? (
          <TourEmptyState />
        ) : (
          <>
            <ul className="mt-16 divide-y divide-white/10 border-y border-white/10">
              {rows.map((show, i) => (
                <li key={show.show_date + show.city + i} className="group">
                  <a href={show.ticket_url ?? "#"} target={show.ticket_url?.startsWith("http") ? "_blank" : undefined}
                     className="grid grid-cols-12 gap-4 items-center py-6 px-2 hover:bg-cream/5 transition">
                    <span className="col-span-3 sm:col-span-2 font-display text-cream text-xl tracking-wide">{show.show_date}</span>
                    <span className="col-span-5 sm:col-span-4 font-display lowercase text-cream text-2xl sm:text-3xl">{show.city}</span>
                    <span className="col-span-3 hidden sm:block text-cream-dim text-sm">{show.venue ?? "—"}</span>
                    <span className="col-span-1 hidden sm:flex items-center gap-1 text-xs uppercase tracking-[0.3em] text-cream-dim">
                      <MapPin className="size-3" /> {show.country ?? ""}
                    </span>
                    <span className="col-span-4 sm:col-span-2 flex justify-end items-center gap-2 text-xs uppercase tracking-[0.2em] text-cream-dim group-hover:text-cream transition">
                      tickets
                      <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-xs uppercase tracking-[0.3em] text-cream-dim">
              more dates announced soon — sign up below to be the first to know.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function TourEmptyState() {
  return (
    <div className="mt-16 border-y border-white/10 py-20 sm:py-28">
      <div className="max-w-2xl mx-auto text-center px-4">
        <p className="text-[10px] uppercase tracking-[0.5em] text-cream-dim">currently</p>
        <h3 className="mt-4 font-display lowercase font-semibold leading-[0.9] text-cream"
            style={{ fontSize: "clamp(2.75rem, 7vw, 5rem)" }}>
          off the road.
        </h3>
        <p className="mt-6 text-base leading-relaxed text-cream-dim max-w-md mx-auto">
          no dates on the books right now. back in the studio, working on what&apos;s next.
        </p>
        <p className="mt-3 text-base leading-relaxed text-cream-dim max-w-md mx-auto">
          sign up below to be the first to hear when shows are announced.
        </p>
        <a
          href="#newsletter"
          className="mt-10 inline-flex items-center justify-center gap-3 rounded-full border border-cream/40 px-7 py-3 text-xs font-medium uppercase tracking-[0.2em] text-cream hover:bg-cream/5 hover:border-cream transition"
        >
          get tour alerts
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </div>
  );
}

/* ---------- ABOUT ---------- */
function About({ content }: { content: SiteContent }) {
  const portrait = content.about.portrait_url ?? "/images/noah-hero.jpeg";
  return (
    <section id="about" className="relative bg-ink py-28 sm:py-40">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <SectionLabel index="05" title="the artist" />

        <div className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-20 items-start">
          <div className="lg:col-span-5 relative aspect-[4/5] overflow-hidden rounded-sm">
            <Image src={portrait} alt="Noah Hill portrait" fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
          </div>

          <div className="lg:col-span-7 lg:pt-8">
            <h2 className="font-display lowercase font-semibold leading-[0.95] text-cream"
                style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}>
              {content.about.tagline_line1} <br/>{content.about.tagline_line2}
            </h2>
            <div className="mt-10 space-y-6 text-cream-dim leading-relaxed max-w-xl">
              {content.about.bio.map((p, i) => <p key={i}>{p}</p>)}
            </div>

            <dl className="mt-12 grid grid-cols-3 gap-6 max-w-xl">
              {content.about.stats.map((s, i) => <Stat key={i} k={s.value} v={s.label} />)}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-l border-cream/20 pl-4">
      <dt className="font-display text-cream text-3xl">{k}</dt>
      <dd className="mt-1 text-[10px] uppercase tracking-[0.3em] text-cream-dim">{v}</dd>
    </div>
  );
}

/* ---------- NEWSLETTER ---------- */
function Newsletter({ content }: { content: SiteContent }) {
  return (
    <section id="newsletter" className="relative grain bg-midnight py-28 sm:py-32 overflow-hidden">
      <div className="halo animate-drift-slow" style={{ width: 700, height: 700, left: "50%", top: "-20%", transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(74,124,133,0.35), transparent 60%)" }} />
      <div className="relative mx-auto max-w-3xl px-6 sm:px-10 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-cream-dim">{content.newsletter.eyebrow}</p>
        <h2 className="mt-4 font-display lowercase font-semibold leading-[0.95] text-cream"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>
          {content.newsletter.heading}
        </h2>
        <p className="mt-6 text-cream-dim max-w-md mx-auto">
          {content.newsletter.copy}
        </p>

        <SubscribeForm />
      </div>
    </section>
  );
}

/* ---------- FOOTER ---------- */
const SOCIAL_ICONS: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  instagram: InstagramIcon,
  youtube:   YoutubeIcon,
  tiktok:    TiktokIcon,
  spotify:   SpotifyIcon,
  apple:     AppleIcon,
  "apple music": AppleIcon,
  amazon:    AmazonIcon,
};

function Footer({ content }: { content: SiteContent }) {
  return (
    <footer className="bg-ink border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 py-16">
        <div className="grid gap-10 md:grid-cols-3 items-start">
          <div>
            <p className="font-display text-cream text-2xl lowercase">noah hill</p>
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-cream-dim">
              official site · 2026
            </p>
          </div>

          <ul className="flex md:justify-center items-center gap-5">
            {content.footer.socials.map(({ name, url }) => {
              const Icon = SOCIAL_ICONS[name.trim().toLowerCase()] ?? InstagramIcon;
              return (
                <SocialLink key={name} href={url || "#"} label={name}>
                  <Icon className="size-4" />
                </SocialLink>
              );
            })}
          </ul>

          <div className="md:text-right text-xs text-cream-dim space-y-2">
            <p><a href={`mailto:${content.footer.management_email}`} className="hover:text-cream transition">{content.footer.management_email}</a></p>
            <p><a href={`mailto:${content.footer.press_email}`} className="hover:text-cream transition">{content.footer.press_email}</a></p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between gap-3 text-[11px] uppercase tracking-[0.3em] text-cream-dim/70">
          <p>© 2026 noah hill · all rights reserved</p>
          <p className="flex items-center gap-2">
            <Music2 className="size-3" /> made with care
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <li>
      <a href={href} aria-label={label} target={href.startsWith("http") ? "_blank" : undefined}
        className="flex size-10 items-center justify-center rounded-full border border-cream/15 text-cream-dim hover:border-cream/50 hover:text-cream transition">
        {children}
      </a>
    </li>
  );
}

function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-6">
      <span className="font-display text-cream-dim text-sm tracking-[0.3em]">{index}</span>
      <span className="h-px flex-1 max-w-16 bg-cream-dim/30" />
      <span className="text-xs uppercase tracking-[0.4em] text-cream-dim">{title}</span>
    </div>
  );
}

/* ---------- INLINE BRAND ICONS ---------- */
function SpotifyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.43a.62.62 0 0 1-.86.21c-2.36-1.44-5.33-1.77-8.83-.97a.62.62 0 0 1-.28-1.22c3.83-.88 7.12-.5 9.76 1.12.3.18.39.57.21.86Zm1.23-2.74a.78.78 0 0 1-1.07.26c-2.7-1.66-6.82-2.14-10.02-1.17a.78.78 0 1 1-.45-1.49c3.66-1.11 8.2-.57 11.3 1.33.37.23.49.71.24 1.07Zm.1-2.85c-3.24-1.92-8.59-2.1-11.69-1.16a.94.94 0 1 1-.55-1.79c3.56-1.08 9.47-.87 13.2 1.34.45.27.6.85.33 1.3a.94.94 0 0 1-1.29.31Z"/>
    </svg>
  );
}
function AppleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.36 12.7c-.02-2.4 1.96-3.55 2.05-3.61-1.12-1.64-2.86-1.86-3.48-1.89-1.48-.15-2.89.87-3.65.87-.76 0-1.91-.85-3.14-.83-1.62.02-3.11.94-3.94 2.39-1.68 2.91-.43 7.22 1.21 9.58.8 1.16 1.75 2.45 3 2.41 1.21-.05 1.66-.78 3.12-.78 1.46 0 1.86.78 3.13.76 1.29-.02 2.11-1.18 2.9-2.34.91-1.34 1.29-2.64 1.31-2.71-.03-.01-2.51-.96-2.51-3.85ZM14.18 5.4c.66-.81 1.11-1.93.99-3.05-.96.04-2.13.64-2.81 1.45-.62.71-1.16 1.86-1.02 2.95 1.07.08 2.18-.55 2.84-1.35Z"/>
    </svg>
  );
}
function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.5 6.2c-.3-1-1-1.8-2-2C19.5 3.7 12 3.7 12 3.7s-7.5 0-9.5.5c-1 .3-1.7 1-2 2C0 8.2 0 12 0 12s0 3.8.5 5.8c.3 1 1 1.8 2 2 2 .5 9.5.5 9.5.5s7.5 0 9.5-.5c1-.3 1.7-1 2-2 .5-2 .5-5.8.5-5.8s0-3.8-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/>
    </svg>
  );
}
function AmazonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M14.86 13.5c-1.79 1.32-4.39 2.02-6.62 2.02-3.13 0-5.96-1.16-8.1-3.08-.17-.15-.02-.36.18-.24 2.31 1.34 5.16 2.15 8.1 2.15 1.99 0 4.18-.41 6.2-1.27.3-.13.55.2.24.42Zm.74-.85c-.23-.29-1.51-.14-2.09-.07-.17.02-.2-.13-.04-.24 1.02-.72 2.7-.51 2.89-.27.2.24-.05 1.93-1.01 2.74-.15.13-.29.06-.22-.1.21-.55.7-1.77.47-2.06ZM12.65 1.5c-3.83 0-6.95 2.49-6.95 5.55 0 3.06 2.31 5.06 5.69 4.95.3-.06 1.05-.07 1.83-.21l.36-.07c.07.04.13.1.13.18 0 .42-2.04 1.7-3.36 1.7-1.61 0-2.93-.74-3.71-2.04-.06-.1-.18-.04-.13.07.86 2.05 2.94 3.07 5.31 3.07 3.45 0 6.62-2.16 6.62-5.66 0-3.41-2.42-5.54-5.79-5.54Zm0 8.6c-1.51 0-2.61-1.4-2.61-3.13s1.1-3.13 2.61-3.13c1.51 0 2.61 1.4 2.61 3.13s-1.1 3.13-2.61 3.13Z"/>
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
      <path d="M19.6 7.3a5.7 5.7 0 0 1-3.4-1.1 5.6 5.6 0 0 1-2.2-3.7H10v12.4a2.7 2.7 0 1 1-2.7-2.7c.27 0 .54.04.79.12V8.1a6.7 6.7 0 1 0 5.91 6.65V9.9a8.6 8.6 0 0 0 5 1.6V7.3h.6Z"/>
    </svg>
  );
}
