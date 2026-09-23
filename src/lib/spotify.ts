/**
 * Spotify artist figures for the press kit's "by the numbers" row.
 *
 * WHAT SPOTIFY ACTUALLY EXPOSES
 * The public Web API returns an artist's follower count and a 0-100 popularity
 * score. It does NOT return monthly listeners or total streams. Those live only
 * in Spotify for Artists, which has no public API, so any figure for them has
 * to be entered by hand. See EPK_CONTENT.numbers.
 *
 * CONFIGURATION
 * Reads the `spotify` row of the connections table first, then falls back to
 * env vars so it can be set up either way:
 *
 *   SPOTIFY_CLIENT_ID      from https://developer.spotify.com/dashboard
 *   SPOTIFY_CLIENT_SECRET
 *   SPOTIFY_ARTIST_ID      the id or the full artist URL
 *
 * Every call fails soft: if Spotify is unreachable or unconfigured, the page
 * falls back to the static figures rather than rendering a hole.
 */

import { getConnection } from "@/lib/connections";

export type SpotifyArtistStats = {
  followers: number;
  popularity: number;
  name: string;
  url: string;
  /** When the figures were fetched, for an "updated" line in the UI. */
  fetchedAt: string;
};

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";
const ARTIST_TTL_SECONDS = 3600;

/**
 * Accepts a bare id, a spotify: URI, or an open.spotify.com link, so whatever
 * the artist pastes in works.
 */
export function parseArtistId(input: string | undefined | null): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  const byUrl = raw.match(/artist[/:]([A-Za-z0-9]+)/);
  if (byUrl) return byUrl[1];
  return /^[A-Za-z0-9]+$/.test(raw) ? raw : null;
}

type SpotifyConfigResolved = { clientId: string; clientSecret: string; artistId: string };

async function resolveConfig(): Promise<SpotifyConfigResolved | null> {
  let clientId: string | undefined;
  let clientSecret: string | undefined;
  let artistId: string | undefined;

  try {
    const conn = await getConnection("spotify");
    if (conn && conn.enabled !== false) {
      clientId = conn.config?.client_id?.trim();
      clientSecret = conn.config?.client_secret?.trim();
      artistId = conn.config?.artist_id?.trim();
    }
  } catch {
    // Table or row missing: fall through to env vars.
  }

  clientId ||= process.env.SPOTIFY_CLIENT_ID?.trim();
  clientSecret ||= process.env.SPOTIFY_CLIENT_SECRET?.trim();
  artistId ||= process.env.SPOTIFY_ARTIST_ID?.trim();

  const id = parseArtistId(artistId);
  if (!clientId || !clientSecret || !id) return null;
  return { clientId, clientSecret, artistId: id };
}

/**
 * Client-credentials token. The token endpoint is a POST, which Next will not
 * cache, so it is held in module memory until shortly before it expires.
 */
let tokenCache: { value: string; expiresAt: number } | null = null;

async function getToken(cfg: SpotifyConfigResolved): Promise<string | null> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.value;

  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;

  tokenCache = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return tokenCache.value;
}

/**
 * Live follower count and popularity, or null when unconfigured or unreachable.
 * Cached for an hour: these figures move slowly and press kits get crawled.
 */
export async function getSpotifyArtist(): Promise<SpotifyArtistStats | null> {
  try {
    const cfg = await resolveConfig();
    if (!cfg) return null;

    const token = await getToken(cfg);
    if (!token) return null;

    const res = await fetch(`${API}/artists/${cfg.artistId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "force-cache",
      next: { revalidate: ARTIST_TTL_SECONDS, tags: ["spotify-artist"] },
    });
    if (!res.ok) {
      // A stale token survives a config change; drop it so the next call retries.
      if (res.status === 401) tokenCache = null;
      return null;
    }

    const a = (await res.json()) as {
      name?: string;
      popularity?: number;
      followers?: { total?: number };
      external_urls?: { spotify?: string };
    };

    return {
      followers: a.followers?.total ?? 0,
      popularity: a.popularity ?? 0,
      name: a.name ?? "",
      url: a.external_urls?.spotify ?? `https://open.spotify.com/artist/${cfg.artistId}`,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * 1234567 becomes "1.2M", 42100 becomes "42K".
 *
 * The unit is chosen against the rounded value, not the raw one: picking it
 * first makes 999,999 render as "1000K" instead of rolling over to "1.0M".
 */
export function formatCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 1_000) return String(Math.round(n));

  const millions = n / 1_000_000;
  if (millions >= 0.9995) {
    return millions >= 9.95 ? `${Math.round(millions)}M` : `${millions.toFixed(1)}M`;
  }

  const thousands = n / 1_000;
  return thousands >= 9.95 ? `${Math.round(thousands)}K` : `${thousands.toFixed(1)}K`;
}
