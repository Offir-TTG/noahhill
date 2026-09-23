import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Typed configs for each known integration.
 * Add new connection types here when integrating new services.
 */
export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from_name: string;
  from_email: string;
};

/**
 * Read-only — the actual Supabase client still reads env vars at boot
 * (chicken/egg: we'd need a connection to read the connection).
 * This type is for the admin registry view.
 */
export type SupabaseConfig = {
  url: string;
  anon_key: string;
  has_secret_key: boolean;
  note?: string;
};

/**
 * Spotify Web API, used for the press kit's live follower count.
 * Note: the Web API does not expose monthly listeners or total streams.
 */
export type SpotifyConfig = {
  client_id: string;
  client_secret: string;
  /** Artist id, or the full open.spotify.com artist URL. */
  artist_id: string;
};

export type ConnectionConfigs = {
  smtp: SmtpConfig;
  supabase: SupabaseConfig;
  spotify: SpotifyConfig;
  // future: stripe: { secret_key: string; publishable_key: string };
  // future: mailchimp: { api_key: string; list_id: string };
};

export type ConnectionId = keyof ConnectionConfigs;

export type Connection<K extends ConnectionId = ConnectionId> = {
  id: K;
  enabled: boolean;
  config: ConnectionConfigs[K];
};

/**
 * Read a connection by id. Returns null if missing.
 *
 * Uses the service client deliberately. The connections table is protected by
 * RLS so only admins can read it, but the public subscribe flow also needs the
 * SMTP settings to send its welcome email, and it runs as an anonymous
 * visitor. Reading through the cookie client returned no rows there, so the
 * email was silently skipped. This module is server-only (see the import
 * above), so the credentials never reach the browser.
 */
export async function getConnection<K extends ConnectionId>(id: K): Promise<Connection<K> | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("connections")
    .select("id, enabled, config")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as K,
    enabled: !!data.enabled,
    config: data.config as ConnectionConfigs[K],
  };
}

/**
 * Resolve SMTP config from DB → fall back to env vars (transition period).
 * Returns null when neither is configured.
 */
export async function resolveSmtp(): Promise<SmtpConfig | null> {
  const conn = await getConnection("smtp");
  const c = conn?.config;

  // 1. Prefer DB if it has all required fields and `enabled` isn't explicitly false.
  const dbReady = !!(c?.host?.trim() && c?.user?.trim() && c?.pass?.trim());
  if (dbReady && conn!.enabled !== false) {
    return {
      host: c!.host.trim(),
      port: Number(c!.port) || 587,
      secure: c!.secure === true,
      user: c!.user.trim(),
      pass: c!.pass.trim(),
      from_name:  c!.from_name?.trim()  || "Noah Hill",
      from_email: c!.from_email?.trim() || c!.user.trim(),
    };
  }

  // 2. Fall back to env vars while the user hasn't migrated yet.
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;

  return {
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user,
    pass,
    from_name:  process.env.SMTP_FROM_NAME?.trim()  || "Noah Hill",
    from_email: process.env.SMTP_FROM_EMAIL?.trim() || user,
  };
}
