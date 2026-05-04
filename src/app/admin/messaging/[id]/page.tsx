import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CampaignComposer, { type Campaign } from "../campaign-composer";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_campaigns")
    .select("id, subject, body_md, preheader, status, recipient_count, sent_count, failed_count, sent_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const campaign: Campaign = {
    id: data.id,
    subject: data.subject ?? "",
    body_md: data.body_md ?? "",
    preheader: data.preheader,
    status: data.status,
    recipient_count: data.recipient_count ?? 0,
    sent_count: data.sent_count ?? 0,
    failed_count: data.failed_count ?? 0,
    sent_at: data.sent_at,
  };

  // If the campaign was sent, also show the per-row send log.
  let sends: { subscriber_email: string; status: string; error_message: string | null; sent_at: string }[] = [];
  if (data.status === "sent" || data.status === "failed") {
    const { data: rows } = await supabase
      .from("email_sends")
      .select("subscriber_email, status, error_message, sent_at")
      .eq("campaign_id", id)
      .order("sent_at", { ascending: true });
    sends = rows ?? [];
  }

  return (
    <div className="space-y-8">
      <Link
        href="/admin/messaging"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-cream-dim hover:text-cream transition"
      >
        <ArrowLeft className="size-3" /> all campaigns
      </Link>

      <CampaignComposer initial={campaign} />

      {(campaign.status === "sent" || campaign.status === "failed") && sends.length > 0 && (
        <section className="rounded-sm border border-white/10 bg-steel/30 p-6">
          <h2 className="font-display lowercase text-cream text-2xl">delivery log</h2>
          <p className="mt-1 text-xs text-cream-dim">
            {campaign.sent_count} delivered · {campaign.failed_count} failed · {campaign.recipient_count} total
          </p>

          <ul className="mt-4 divide-y divide-white/5 border-y border-white/5">
            {sends.map((s, i) => (
              <li key={i} className="grid grid-cols-12 gap-2 items-center py-2 px-2 text-xs">
                {s.status === "sent" ? (
                  <CheckCircle2 className="col-span-1 size-3.5 text-gold" />
                ) : (
                  <AlertCircle className="col-span-1 size-3.5 text-red-300" />
                )}
                <span className="col-span-7 sm:col-span-5 text-cream truncate">{s.subscriber_email}</span>
                <span className="col-span-4 sm:col-span-3 text-cream-dim">
                  {new Date(s.sent_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                </span>
                {s.error_message && (
                  <span className="col-span-12 sm:col-span-3 text-red-300/80 truncate" title={s.error_message}>
                    {s.error_message}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
