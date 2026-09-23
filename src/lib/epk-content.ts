/**
 * Electronic Press Kit copy.
 *
 * Everything the public site already knows about (bio, stats, songs, videos,
 * tour dates, socials, emails) is read live from Supabase by /epk. It is NOT
 * duplicated here. This file holds only the press-facing extras: the bio,
 * quotes, booking availability and press photos.
 *
 * Edit this file to update the press kit.
 */

export type PressQuote = {
  quote: string;
  source: string;
  meta?: string;   // e.g. "album review · march 2026"
  url?: string;
};

export type PressPhoto = {
  /** A file in /public/images, or null to fall back to fromSong / the site hero. */
  url: string | null;
  /** When url is null, use this song's cover art. See resolvePhotos() in the page. */
  fromSong?: string;
  label: string;
  credit: string;
  /** Filename used when the press downloads it. */
  filename: string;
  orientation: "portrait" | "square" | "landscape";
};

/** A figure in the "by the numbers" row. */
export type EpkNumber = {
  /** Shown as-is, or as the fallback when a live source fails. */
  value: string;
  label: string;
  note?: string;
  /**
   * Fetch this figure live. Spotify's Web API only exposes followers and a
   * 0-100 popularity score: monthly listeners and total streams are not
   * available from any public API and must stay manual.
   */
  source?: "spotify_followers" | "spotify_popularity";
};

export type EpkContent = {
  meta: {
    eyebrow: string;
    title_line1: string;
    title_line2: string;
    positioning: string;
    updated: string;
  };
  facts: { label: string; value: string }[];
  bios: {
    /**
     * One line, for the meta and OpenGraph description. The bio itself is NOT
     * stored here: the kit renders about.bio from the site content, so the
     * homepage and the press kit can never disagree about it.
     */
    one_line: string;
  };
  /**
   * Press quotes. Ships empty on purpose. The section renders a clean
   * "coverage lands here" state until there is real coverage to show.
   * Add entries as they come in, newest first:
   *
   *   { quote: "…", source: "Publication", meta: "review · 2026", url: "https://…" }
   */
  quotes: PressQuote[];
  /**
   * Platform numbers the site's About stats don't cover.
   * Entries with a `source` are fetched live; `value` is then only the
   * fallback shown when Spotify is unconfigured or unreachable.
   * Everything else has to be kept current by hand.
   */
  numbers: EpkNumber[];
  live: {
    availability: string;
    availability_note: string;
  };
  photos: PressPhoto[];
  contacts: { role: string; name: string; email: string; note: string }[];
};

export const DEFAULT_EPK: EpkContent = {
  meta: {
    eyebrow: "electronic press kit · 2026",
    title_line1: "noah",
    title_line2: "hill",
    positioning:
      "pop music with rock influence, written for those who feel like they don't fit in.",
    updated: "2026",
  },

  facts: [
    { label: "based in",       value: "New York, NY" },
    { label: "genre",          value: "pop · rock · singer-songwriter" },
    { label: "latest release", value: "hurt somebody (single, 2026)" },
    { label: "next up",        value: "new single \"stay\" · coming soon" },
    { label: "for fans of",    value: "Ed Sheeran · Teddy Swims · Shawn Mendes · 5SOS" },
    { label: "label",          value: "independent" },
    { label: "publishing",     value: "self-published" },
    { label: "territories",    value: "US · UK · EU" },
  ],

  bios: {
    one_line:
      "Noah Hill is a singer, songwriter and producer from New Jersey, writing pop songs with rock in them for anyone who has ever felt like a misfit. His single \"hurt somebody\" is out now.",
  },

  quotes: [],

  numbers: [
    // The value here is the figure supplied by the artist; once the Spotify
    // connection works it is replaced by the live count on every request.
    { value: "157", label: "followers", note: "Spotify", source: "spotify_followers" },
    { value: "300K", label: "streams" },
  ],

  live: {
    availability: "routing 2026 · booking now",
    availability_note:
      "Available for headline dates, support runs, festivals and sessions across US, UK and EU. Currently off the road and finishing the EP. Send offers to booking below.",
  },

  photos: [
    { url: "/images/Noah1.jpeg", label: "primary press shot",    credit: "photo: courtesy of the artist",   filename: "noah-hill-press-01.jpg", orientation: "portrait" },
    { url: "/images/Noah2.jpeg", label: "studio portrait",       credit: "photo: courtesy of the artist",   filename: "noah-hill-press-02.jpg", orientation: "portrait" },
    { url: "/images/Noah3.jpeg", label: "new york, on location", credit: "photo: courtesy of the artist",   filename: "noah-hill-press-03.jpg", orientation: "portrait" },
    { url: "/images/Noah5.jpeg", label: "acoustic, live",        credit: "photo: courtesy of the artist",   filename: "noah-hill-press-04.jpg", orientation: "portrait" },
    { url: "/images/Noah4.jpeg", label: "acoustic, seated",      credit: "photo: courtesy of the artist",   filename: "noah-hill-press-05.jpg", orientation: "portrait" },
    { url: null, fromSong: "hurt somebody", label: "hurt somebody cover art", credit: "artwork: courtesy of the artist", filename: "hurt-somebody-cover.jpg", orientation: "square" },
    { url: null, fromSong: "fix me",        label: "fix me cover art",        credit: "artwork: courtesy of the artist", filename: "fix-me-cover.jpg",        orientation: "square" },
  ],

  contacts: [
    { role: "contact", name: "Noah Hill", email: "noahhill.m@gmail.com", note: "Booking, press and general enquiries" },
  ],
};

/**
 * Merge stored EPK content over the defaults, so a field added here later does
 * not break a site whose saved blob predates it. Mirrors mergeContent().
 */
export function mergeEpk(partial: Partial<EpkContent> | null | undefined): EpkContent {
  if (!partial) return DEFAULT_EPK;
  return {
    meta:     { ...DEFAULT_EPK.meta,  ...(partial.meta  ?? {}) },
    facts:    partial.facts    ?? DEFAULT_EPK.facts,
    bios:     { ...DEFAULT_EPK.bios,  ...(partial.bios  ?? {}) },
    quotes:   partial.quotes   ?? DEFAULT_EPK.quotes,
    numbers:  partial.numbers  ?? DEFAULT_EPK.numbers,
    live:     { ...DEFAULT_EPK.live,  ...(partial.live  ?? {}) },
    photos:   partial.photos   ?? DEFAULT_EPK.photos,
    contacts: partial.contacts ?? DEFAULT_EPK.contacts,
  };
}
