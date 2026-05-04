import { createClient } from "@/lib/supabase/server";
import type { SmtpConfig, SupabaseConfig } from "@/lib/connections";
import { Mail, Database, CheckCircle2, AlertCircle } from "lucide-react";
import SmtpForm from "./smtp-form";

export const dynamic = "force-dynamic";

export default async function AdminConnectionsPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("connections")
    .select("id, enabled, config, updated_at");

  type Row = { id: string; enabled: boolean; config: unknown; updated_at: string };
  const map = new Map<string, Row>();
  (rows ?? []).forEach((r) => map.set(r.id, r as Row));

  const smtp = map.get("smtp");
  const smtpConfig = (smtp?.config as Partial<SmtpConfig> | undefined) ?? {};
  const smtpInitial: SmtpConfig = {
    host:       smtpConfig.host       ?? "",
    port:       smtpConfig.port       ?? 587,
    secure:     smtpConfig.secure     ?? false,
    user:       smtpConfig.user       ?? "",
    pass:       "", // never send the stored password to the client
    from_name:  smtpConfig.from_name  ?? "Noah Hill",
    from_email: smtpConfig.from_email ?? "",
  };
  const smtpHasPassword = !!smtpConfig.pass;
  const smtpStatus = smtp?.enabled && smtpConfig.host && smtpConfig.user && smtpConfig.pass ? "connected" : "disconnected";

  // Supabase (read-only — values from env)
  const supaPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supaAnonKey   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supaSecret    = !!process.env.SUPABASE_SECRET_KEY;
  const supaConfig    = (map.get("supabase")?.config as Partial<SupabaseConfig> | undefined) ?? {};

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display lowercase text-cream text-3xl sm:text-4xl">connections</h1>
        <p className="mt-2 text-sm text-cream-dim">
          one place for every external integration. credentials live in the database (admin-only RLS); env vars are kept as fallback.
        </p>
      </div>

      {error && (
        <div className="rounded-sm border border-red-300/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          could not load: {error.message}
          <span className="block mt-1 text-red-300/70 normal-case">
            (have you run the 0005_connections.sql migration?)
          </span>
        </div>
      )}

      {/* SMTP */}
      <Section
        icon={Mail}
        title="smtp · email"
        desc="used to send subscriber emails from /admin/messaging."
        status={smtpStatus}
      >
        <SmtpForm
          initial={{
            enabled: smtp?.enabled ?? false,
            config:  smtpInitial,
            hasStoredPassword: smtpHasPassword,
          }}
        />
      </Section>

      {/* Supabase */}
      <Section
        icon={Database}
        title="supabase · database & storage"
        desc="bootstrap connection — values are read from env at runtime, not from the db (chicken/egg)."
        status={supaPublicUrl && supaAnonKey ? "connected" : "disconnected"}
      >
        <div className="space-y-3">
          <ReadOnlyField label="project url" value={supaPublicUrl || "(not set)"} />
          <ReadOnlyField label="publishable key" value={supaAnonKey ? maskKey(supaAnonKey) : "(not set)"} />
          <ReadOnlyField label="secret key" value={supaSecret ? "•••••••••• (configured)" : "(not set)"} />
          {supaConfig?.note && (
            <p className="text-[11px] text-cream-dim/70 pt-2">{supaConfig.note}</p>
          )}
          <p className="text-[11px] text-cream-dim/70">
            to change the supabase project, edit <code className="px-1 bg-cream/10 rounded">.env.local</code> and restart the dev server.
          </p>
        </div>
      </Section>

      {/* Future placeholder card */}
      <Section icon={Mail} title="more integrations" desc="add stripe, mailchimp, social apis here later." status="placeholder">
        <p className="text-xs text-cream-dim">
          adding a new integration is a 4-step pattern:
        </p>
        <ol className="mt-2 text-xs text-cream-dim space-y-1 list-decimal pl-5">
          <li>add a row to the <code className="px-1 bg-cream/10 rounded">connections</code> table (sql)</li>
          <li>add the type to <code className="px-1 bg-cream/10 rounded">ConnectionConfigs</code> in <code className="px-1 bg-cream/10 rounded">src/lib/connections.ts</code></li>
          <li>build a per-integration form like <code className="px-1 bg-cream/10 rounded">smtp-form.tsx</code></li>
          <li>render it from this page</li>
        </ol>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  desc,
  status,
  children,
}: {
  icon: typeof Mail;
  title: string;
  desc: string;
  status: "connected" | "disconnected" | "placeholder";
  children: React.ReactNode;
}) {
  const badge =
    status === "connected"
      ? <span className="inline-flex items-center gap-1 rounded-sm border border-gold/30 bg-gold/10 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-gold">
          <CheckCircle2 className="size-3" /> connected
        </span>
      : status === "disconnected"
      ? <span className="inline-flex items-center gap-1 rounded-sm border border-red-400/30 bg-red-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-red-300">
          <AlertCircle className="size-3" /> disconnected
        </span>
      : <span className="inline-flex items-center gap-1 rounded-sm border border-cream/15 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-cream-dim">
          coming soon
        </span>;

  return (
    <section className="rounded-sm border border-white/10 bg-steel/30 p-4 sm:p-6">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-sm bg-cream/5 text-cream-dim">
            <Icon className="size-4" />
          </span>
          <div>
            <h2 className="font-display lowercase text-cream text-2xl">{title}</h2>
            <p className="mt-0.5 text-xs text-cream-dim">{desc}</p>
          </div>
        </div>
        {badge}
      </header>
      {children}
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">{label}</p>
      <p className="mt-1 px-3 py-2 rounded-sm border border-cream/10 bg-ink/40 text-sm text-cream-dim font-mono break-all">
        {value}
      </p>
    </div>
  );
}

function maskKey(key: string) {
  if (key.length < 12) return "•••••";
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}
