import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { mergeContent, type SiteContent } from "@/lib/site-content";
import { SITE_URL } from "@/lib/site-url";

/**
 * The card shown when the site is shared to WhatsApp, Slack, iMessage or X.
 *
 * Built rather than reusing a photo: the press shots are portrait, and link
 * previews crop to a wide strip, so a raw photo loses the subject. This keeps
 * the name legible at thumbnail size and matches the site's palette.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Noah Hill";

// The preview should follow the site, but not re-query on every crawl.
export const revalidate = 3600;

async function heroPhoto(): Promise<{ url: string | null; content: SiteContent }> {
  let content = mergeContent(null);
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_content").select("data").eq("id", 1).maybeSingle();
    content = mergeContent((data?.data ?? null) as Partial<SiteContent> | null);
  } catch {
    return { url: null, content };
  }

  const raw = content.hero.photo_url;
  if (!raw) return { url: null, content };

  // Inlined as a data URI rather than handed to ImageResponse as a URL. Its
  // own fetch does not follow redirects, and SITE_URL is the apex which
  // redirects to www, so a URL here silently produced a card with no photo.
  const candidates = raw.startsWith("http")
    ? [raw]
    : [`${SITE_URL}${raw}`, `${SITE_URL.replace("://", "://www.")}${raw}`];

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { redirect: "follow" });
      if (!res.ok) continue;
      const type = res.headers.get("content-type") ?? "image/jpeg";
      const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
      return { url: `data:${type};base64,${b64}`, content };
    } catch {
      // try the next candidate
    }
  }
  return { url: null, content };
}

export default async function Image() {
  const { url, content } = await heroPhoto();
  const name = `${content.hero.name_line1} ${content.hero.name_line2}`.trim();
  const role = content.hero.role;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#060a0d",
          color: "#e8d9bd",
          fontFamily: "sans-serif",
        }}
      >
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "75% 22%",
              opacity: 0.55,
            }}
          />
        )}

        {/* Keeps the type readable whatever the photo is doing behind it. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, #060a0d 18%, rgba(6,10,13,0.75) 55%, rgba(6,10,13,0.25) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "64px 72px",
            width: "100%",
          }}
        >
          <div style={{ fontSize: 22, letterSpacing: 10, color: "#b5a586", textTransform: "uppercase" }}>
            {role}
          </div>
          <div
            style={{
              fontSize: 132,
              fontWeight: 700,
              lineHeight: 1,
              marginTop: 18,
              letterSpacing: -3,
            }}
          >
            {name}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 26 }}>
            <div style={{ width: 56, height: 3, background: "#c8b27f" }} />
            <div style={{ fontSize: 24, letterSpacing: 6, color: "#b5a586", marginLeft: 20 }}>
              noahill.com
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
