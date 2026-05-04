/**
 * Migrate connection settings from .env.local into the `connections` table.
 *
 * Run after 0005_connections.sql has been applied in Supabase.
 * Idempotent: re-running is safe (uses upsert).
 *
 * Usage: npm run migrate-env
 */

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const SUPABASE_ANON   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

// Admin client — bypasses RLS so we can write the connections table.
const sb = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ok  = (m) => console.log("✓", m);
const log = (...a) => console.log("→", ...a);

async function upsertConnection(id, enabled, config) {
  const { error } = await sb
    .from("connections")
    .upsert({ id, enabled, config }, { onConflict: "id" });
  if (error) throw new Error(`${id}: ${error.message}`);
  ok(`upserted '${id}' (${enabled ? "enabled" : "disabled"})`);
}

async function main() {
  log("seeding connections from .env.local");

  // ── SMTP ─────────────────────────────────────────────────
  const smtpHost = (process.env.SMTP_HOST || "").trim();
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.SMTP_PASS || "").trim();
  const hasSmtp = !!(smtpHost && smtpUser && smtpPass);

  await upsertConnection("smtp", hasSmtp, {
    host:       smtpHost,
    port:       Number(process.env.SMTP_PORT) || 587,
    secure:     process.env.SMTP_SECURE === "true",
    user:       smtpUser,
    pass:       smtpPass,
    from_name:  (process.env.SMTP_FROM_NAME  || "Noah Hill").trim(),
    from_email: (process.env.SMTP_FROM_EMAIL || smtpUser || "").trim(),
  });

  if (!hasSmtp) {
    console.warn("  ⚠ SMTP fields are empty in .env.local — connection saved but disabled.");
    console.warn("    Fill in /admin/connections to enable it.");
  }

  // ── Supabase ─────────────────────────────────────────────
  // Stored read-only for the audit registry only. Code never reads these from the DB.
  await upsertConnection("supabase", !!(SUPABASE_URL && SUPABASE_ANON), {
    url:            SUPABASE_URL || "",
    anon_key:       SUPABASE_ANON || "",
    has_secret_key: !!SUPABASE_SECRET,
    note: "Bootstrap connection — values resolved from env at runtime, not from this row.",
  });

  console.log("\n🎉 connections seeded — open /admin/connections to verify.");
}

main().catch((e) => {
  console.error("\n✗ migration failed:", e.message);
  process.exit(1);
});
