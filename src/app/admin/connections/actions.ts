"use server";

import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import type { SmtpConfig } from "@/lib/connections";
import { revalidatePath } from "next/cache";

/* ───────────── SMTP ───────────── */

export async function saveSmtp(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const enabled = formData.get("enabled") === "on";
  const host = String(formData.get("host") ?? "").trim();
  const portRaw = Number(formData.get("port") ?? 587);
  const secure = formData.get("secure") === "on";
  const user = String(formData.get("user") ?? "").trim();
  const passInput = String(formData.get("pass") ?? "");
  const from_name  = String(formData.get("from_name")  ?? "").trim() || "Noah Hill";
  const from_email = String(formData.get("from_email") ?? "").trim();

  // If the password field was left blank, keep the existing one (admins shouldn't have to re-enter on every save).
  let pass = passInput.trim();
  if (!pass) {
    const { data: existing } = await supabase
      .from("connections")
      .select("config")
      .eq("id", "smtp")
      .maybeSingle();
    pass = (existing?.config as SmtpConfig | null)?.pass ?? "";
  }

  if (!host || !user) {
    return { ok: false, error: "Host and user are required." };
  }

  const config: SmtpConfig = {
    host,
    port: portRaw || 587,
    secure,
    user,
    pass,
    from_name,
    from_email: from_email || user,
  };

  const { error } = await supabase
    .from("connections")
    .upsert({ id: "smtp", enabled, config }, { onConflict: "id" });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/connections");
  return { ok: true };
}

/**
 * Verify the SMTP config the form is currently showing — even before save —
 * by spinning up a temporary transporter from the form values.
 */
export async function testSmtp(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const host = String(formData.get("host") ?? "").trim();
  const port = Number(formData.get("port") ?? 587) || 587;
  const secure = formData.get("secure") === "on";
  const user = String(formData.get("user") ?? "").trim();
  const passInput = String(formData.get("pass") ?? "").trim();

  if (!host || !user) return { ok: false, error: "Host and user are required." };

  // If pass field is blank, fall back to stored value.
  let pass = passInput;
  if (!pass) {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("connections")
      .select("config")
      .eq("id", "smtp")
      .maybeSingle();
    pass = (existing?.config as SmtpConfig | null)?.pass ?? "";
    if (!pass) return { ok: false, error: "Password is required for first-time test." };
  }

  try {
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    await transporter.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Verification failed." };
  }
}
