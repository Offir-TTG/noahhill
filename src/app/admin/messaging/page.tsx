import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus, Send, FileEdit, AlertCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminMessagingPage() {
  const supabase = await createClient();
  const { data: campaigns, error } = await supabase
    .from("email_campaigns")
    .select("id, subject, status, recipient_count, sent_count, failed_count, sent_at, updated_at, preheader")
    .order("updated_at", { ascending: false });

  const { count: subscribersCount } = await supabase
    .from("subscribers")
    .select("*", { count: "exact", head: true });

  const fmt = (s: string | null) => {
    if (!s) return "—";
    try { return new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
    catch { return s; }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { color: string; icon: typeof Clock }> = {
      draft:   { color: "text-cream-dim border-cream/20",       icon: FileEdit  },
      sending: { color: "text-gold border-gold/30 bg-gold/5",   icon: Clock     },
      sent:    { color: "text-gold border-gold/30 bg-gold/10",  icon: Send      },
      failed:  { color: "text-red-300 border-red-400/30 bg-red-500/5", icon: AlertCircle },
    };
    const { color, icon: Icon } = map[status] ?? map.draft;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[10px] uppercase tracking-[0.25em] ${color}`}>
        <Icon className="size-3" /> {status}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display lowercase text-cream text-3xl sm:text-4xl">messaging</h1>
          <p className="mt-2 text-sm text-cream-dim">
            email all {subscribersCount ?? 0} subscribers — drafts, history, and one-click sends.
          </p>
        </div>
        <Link
          href="/admin/messaging/new"
          className="inline-flex items-center gap-2 rounded-sm bg-cream px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition self-start"
        >
          <Plus className="size-3.5" />
          new campaign
        </Link>
      </div>

      {error && (
        <div className="rounded-sm border border-red-300/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          could not load campaigns: {error.message}
          <span className="block mt-1 text-red-300/70 normal-case">
            (have you run the 0004_email.sql migration in supabase?)
          </span>
        </div>
      )}

      {campaigns && campaigns.length === 0 ? (
        <div className="rounded-sm border border-dashed border-white/10 p-12 text-center">
          <p className="text-cream-dim text-sm">
            no campaigns yet — click <Link href="/admin/messaging/new" className="text-cream underline">new campaign</Link> to write your first email.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5 border-y border-white/5">
          {(campaigns ?? []).map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/messaging/${c.id}`}
                className="grid grid-cols-12 gap-3 items-center px-4 py-4 hover:bg-cream/5 transition"
              >
                <div className="col-span-7 sm:col-span-5 min-w-0">
                  <p className="font-display lowercase text-cream text-xl truncate">
                    {c.subject || "(untitled)"}
                  </p>
                  {c.preheader && (
                    <p className="mt-0.5 text-xs text-cream-dim truncate">{c.preheader}</p>
                  )}
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <StatusBadge status={c.status} />
                </div>
                <p className="col-span-12 sm:col-span-2 text-xs text-cream-dim">
                  {c.status === "sent" || c.status === "failed"
                    ? `${c.sent_count}/${c.recipient_count} sent`
                    : `${c.recipient_count || 0} recipients`}
                </p>
                <p className="col-span-12 sm:col-span-3 text-xs text-cream-dim sm:text-right">
                  {c.sent_at ? `sent ${fmt(c.sent_at)}` : `edited ${fmt(c.updated_at)}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
