import { createClient } from "@/lib/supabase/server";

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

export type ConnectionConfigs = {
  smtp: SmtpConfig;
  supabase: SupabaseConfig;
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
 */
export async function getConnection<K extends ConnectionId>(id: K): Promise<Connection<K> | null> {
  const supabase = await createClient();
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
