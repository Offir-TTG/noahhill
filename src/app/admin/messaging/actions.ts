"use server";

import { createClient } from "@/lib/supabase/server";
import { getTransporter, fromAddress, verifySmtp } from "@/lib/email/transport";
import { renderEmail } from "@/lib/email/template";
import { extractStorageUrlsFromMarkdown, removeStorageFiles } from "@/lib/storage";
import { revalidatePath } from "next/cache";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "image";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/* ------------------ DRAFT CRUD ------------------ */

export async function createDraft(formData: FormData) {
  const supabase = await createClient();
  const subject   = String(formData.get("subject")   ?? "").trim();
  const bodyMd    = String(formData.get("body_md")   ?? "");
  const preheader = String(formData.get("preheader") ?? "").trim() || null;

  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({ subject, body_md: bodyMd, preheader, status: "draft" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/admin/messaging");
  return { id: data.id };
}

export async function updateDraft(id: string, formData: FormData) {
  const supabase = await createClient();
  const subject   = String(formData.get("subject")   ?? "").trim();
  const bodyMd    = String(formData.get("body_md")   ?? "");
  const preheader = String(formData.get("preheader") ?? "").trim() || null;

  const { error } = await supabase
    .from("email_campaigns")
    .update({ subject, body_md: bodyMd, preheader })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/messaging");
  revalidatePath(`/admin/messaging/${id}`);
}

export async function deleteCampaign(id: string) {
  const supabase = await createClient();

  // Read the body so we can clean up any images that were uploaded for this campaign.
  const { data: existing } = await supabase
    .from("email_campaigns")
    .select("body_md")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (existing?.body_md) {
    const urls = extractStorageUrlsFromMarkdown(existing.body_md);
    if (urls.length) await removeStorageFiles(urls);
  }

  revalidatePath("/admin/messaging");
}

/* ------------------ IMAGE UPLOAD ------------------ */

export async function uploadCampaignImage(formData: FormData): Promise<string> {
  const supabase = await createClient();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided");

  const ext  = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;
  const { error } = await supabase.storage
    .from("campaign-images")
    .upload(path, file, { contentType: file.type || undefined, cacheControl: "3600", upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  return supabase.storage.from("campaign-images").getPublicUrl(path).data.publicUrl;
}

/* ------------------ SENDING ------------------ */

type SendResult = {
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  errors: { email: string; message: string }[];
};

export async function sendTestEmail(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const subject   = String(formData.get("subject")   ?? "").trim();
  const bodyMd    = String(formData.get("body_md")   ?? "");
  const preheader = String(formData.get("preheader") ?? "").trim() || null;
  const to        = String(formData.get("to")        ?? "").trim();

  if (!subject) return { ok: false, error: "Subject is required." };
  if (!bodyMd)  return { ok: false, error: "Body is required." };
  if (!to)      return { ok: false, error: "Test recipient email is required." };

  const verify = await verifySmtp();
  if (!verify.ok) return { ok: false, error: `SMTP not ready: ${verify.error}` };

  try {
    const { html, text } = await renderEmail({
      subject,
      bodyMd,
      preheader,
      // Test sends use a dummy unsubscribe token (no real subscriber yet).
      unsubscribeUrl: `${siteUrl()}/unsubscribe?token=00000000-0000-0000-0000-000000000000`,
      siteUrl: siteUrl(),
    });

    const transporter = await getTransporter();
    await transporter.sendMail({
      from: await fromAddress(),
      to,
      subject: `[TEST] ${subject}`,
      html,
      text,
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send test email" };
  }
}

export async function sendCampaign(id: string): Promise<SendResult> {
  const supabase = await createClient();

  // 1. Load campaign
  const { data: campaign, error: cErr } = await supabase
    .from("email_campaigns")
    .select("id, subject, body_md, preheader, status")
    .eq("id", id)
    .single();
  if (cErr || !campaign) throw new Error(cErr?.message ?? "Campaign not found");
  if (campaign.status === "sent") throw new Error("This campaign has already been sent.");
  if (!campaign.subject?.trim()) throw new Error("Add a subject before sending.");
  if (!campaign.body_md?.trim()) throw new Error("Add a body before sending.");

  // 2. Verify SMTP first so we fail fast.
  const verify = await verifySmtp();
  if (!verify.ok) {
    await supabase
      .from("email_campaigns")
      .update({ status: "failed" })
      .eq("id", id);
    throw new Error(`SMTP not ready: ${verify.error}`);
  }

  // 3. Mark sending + load subscribers
  await supabase.from("email_campaigns").update({ status: "sending" }).eq("id", id);

  const { data: subscribers, error: sErr } = await supabase
    .from("subscribers")
    .select("email, unsubscribe_token");
  if (sErr) {
    await supabase.from("email_campaigns").update({ status: "failed" }).eq("id", id);
    throw new Error(sErr.message);
  }

  const recipients = subscribers ?? [];
  if (recipients.length === 0) {
    await supabase.from("email_campaigns").update({
      status: "sent",
      recipient_count: 0,
      sent_count: 0,
      failed_count: 0,
      sent_at: new Date().toISOString(),
    }).eq("id", id);
    revalidatePath("/admin/messaging");
    return { recipientCount: 0, sentCount: 0, failedCount: 0, errors: [] };
  }

  // 4. Send one at a time (simple + reliable for small artist lists).
  const transporter = await getTransporter();
  const from = await fromAddress();
  const errors: { email: string; message: string }[] = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const sub of recipients) {
    const unsubUrl = `${siteUrl()}/unsubscribe?token=${sub.unsubscribe_token}`;
    try {
      const { html, text } = await renderEmail({
        subject:   campaign.subject,
        bodyMd:    campaign.body_md,
        preheader: campaign.preheader,
        unsubscribeUrl: unsubUrl,
        siteUrl:   siteUrl(),
      });

      await transporter.sendMail({
        from,
        to: sub.email,
        subject: campaign.subject,
        html,
        text,
        list: { unsubscribe: { url: unsubUrl, comment: "Unsubscribe" } },
      });

      await supabase.from("email_sends").insert({
        campaign_id: id,
        subscriber_email: sub.email,
        status: "sent",
      });
      sentCount += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Send failed";
      errors.push({ email: sub.email, message });
      await supabase.from("email_sends").insert({
        campaign_id: id,
        subscriber_email: sub.email,
        status: "failed",
        error_message: message,
      });
      failedCount += 1;
    }
  }

  await supabase.from("email_campaigns").update({
    status: failedCount === recipients.length ? "failed" : "sent",
    recipient_count: recipients.length,
    sent_count: sentCount,
    failed_count: failedCount,
    sent_at: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath("/admin/messaging");
  revalidatePath(`/admin/messaging/${id}`);

  return { recipientCount: recipients.length, sentCount, failedCount, errors };
}
