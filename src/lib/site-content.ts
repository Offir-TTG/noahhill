/**
 * Default copy used when the database row is empty.
 * The admin editor reads/writes this same shape into site_content.data (JSONB).
 */
export type SiteContent = {
  hero: {
    eyebrow: string;
    name_line1: string;
    name_line2: string;
    photo_url: string | null;
    side_label: string;
    role: string;
    location: string;
  };
  marquee: { items: string[] };
  single: {
    eyebrow: string;
    title_line1: string;
    title_line2: string;
    description: string;
    cover_url: string | null;
    streaming: { name: string; url: string }[];
  };
  about: {
    tagline_line1: string;
    tagline_line2: string;
    bio: string[];
    portrait_url: string | null;
    stats: { value: string; label: string }[];
  };
  newsletter: {
    eyebrow: string;
    heading: string;
    copy: string;
  };
  footer: {
    management_email: string;
    press_email: string;
    socials: { name: string; url: string }[];
  };
};

export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    eyebrow: "new single · hurt somebody · out now",
    name_line1: "noah",
    name_line2: "hill",
    photo_url: "/images/noah-hero.jpeg",
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
      "A late-night confession dressed in hushed drums and warm tape saturation — the first taste of what's coming.",
    cover_url: "/images/noah-hero.jpeg",
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
      "Noah Hill writes the kind of songs that sit inside a room with you — close, unhurried, and honest.",
      "His debut single \"hurt somebody\" arrived as a meditation on the small cruelties we don't talk about. A debut EP follows later this year.",
    ],
    portrait_url: "/images/noah-hero.jpeg",
    stats: [
      { value: "2.4M", label: "monthly listeners" },
      { value: "12",   label: "cities · 2026"     },
      { value: "08",   label: "songs · debut EP"  },
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
      { name: "Instagram", url: "#" },
      { name: "YouTube",   url: "#" },
      { name: "TikTok",    url: "#" },
      { name: "Spotify",   url: "#" },
      { name: "Apple Music", url: "#" },
    ],
  },
};

/** Merge DB content over defaults so the public site never breaks if a field is missing. */
export function mergeContent(partial: Partial<SiteContent> | null | undefined): SiteContent {
  if (!partial) return DEFAULT_CONTENT;
  return {
    hero:       { ...DEFAULT_CONTENT.hero,       ...(partial.hero       ?? {}) },
    marquee:    { ...DEFAULT_CONTENT.marquee,    ...(partial.marquee    ?? {}) },
    single:     { ...DEFAULT_CONTENT.single,     ...(partial.single     ?? {}) },
    about:      { ...DEFAULT_CONTENT.about,      ...(partial.about      ?? {}) },
    newsletter: { ...DEFAULT_CONTENT.newsletter, ...(partial.newsletter ?? {}) },
    footer:     { ...DEFAULT_CONTENT.footer,     ...(partial.footer     ?? {}) },
  };
}
