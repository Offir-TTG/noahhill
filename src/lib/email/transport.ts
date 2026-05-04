import nodemailer, { type Transporter } from "nodemailer";
import { resolveSmtp } from "@/lib/connections";

/**
 * Build a transporter from the current SMTP config.
 * Note: not cached because the admin can change settings at /admin/connections at any time.
 * The cost of constructing a Transporter is trivial; pooled connections are kept by nodemailer.
 */
export async function getTransporter(): Promise<Transporter> {
  const smtp = await resolveSmtp();
  if (!smtp) {
    throw new Error(
      "SMTP is not configured. Open /admin/connections and set up the SMTP integration.",
    );
  }
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
}

export async function fromAddress(): Promise<string> {
  const smtp = await resolveSmtp();
  const name  = smtp?.from_name  || "Noah Hill";
  const email = smtp?.from_email || smtp?.user || "no-reply@example.com";
  return `"${name.replace(/"/g, "")}" <${email}>`;
}

export async function verifySmtp(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const t = await getTransporter();
    await t.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "SMTP verification failed" };
  }
}
