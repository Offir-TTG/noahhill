"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getTransporter, fromAddress } from "@/lib/email/transport";
import { renderEmail } from "@/lib/email/template";
import { welcomeEmail } from "@/lib/email/welcome";
import { SITE_URL } from "@/lib/site-url";

export type SubscribeResult =
  | { ok: true; status: "subscribed" | "already"; emailed: boolean }
  | { ok: false; message: string };

/** Deliberately loose: the point is to reject obvious typos, not to police addresses. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Subscribe an address and send the welcome email.
 *
 * Runs on the server because SMTP credentials cannot reach the browser, and
 * because reading back the new row's unsubscribe_token needs service-role
 * access (anonymous visitors may insert but not select).
 */
export async function subscribe(rawEmail: string): Promise<SubscribeResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "that doesn't look like a valid email." };
  }

  let unsubscribeToken: string;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("subscribers")
      .insert({ email, source: "newsletter" })
      .select("unsubscribe_token")
      .single();

    if (error) {
      // 23505 = unique violation. Already subscribed is a success for the
      // visitor, and must not trigger a second welcome email.
      if (error.code === "23505") return { ok: true, status: "already", emailed: false };
      console.error("[subscribe] insert failed", error);
      return { ok: false, message: "something went wrong. please try again in a moment." };
    }

    unsubscribeToken = data.unsubscribe_token as string;
  } catch (e) {
    console.error("[subscribe] unexpected", e);
    return { ok: false, message: "something went wrong. please try again in a moment." };
  }

  // The subscription has already succeeded. A mail failure (SMTP unconfigured,
  // provider down) must not be reported to the visitor as a failed signup, so
  // it is logged rather than thrown.
  let emailed = false;
  try {
    const { subject, preheader, bodyMd } = welcomeEmail();
    const { html, text } = await renderEmail({
      subject,
      bodyMd,
      preheader,
      unsubscribeUrl: `${SITE_URL}/unsubscribe?token=${unsubscribeToken}`,
      siteUrl: SITE_URL,
    });

    const transporter = await getTransporter();
    await transporter.sendMail({
      from: await fromAddress(),
      to: email,
      subject,
      html,
      text,
      headers: {
        // Lets mail clients offer one-click unsubscribe, which keeps the
        // sender reputation healthier than people marking it as spam.
        "List-Unsubscribe": `<${SITE_URL}/unsubscribe?token=${unsubscribeToken}>`,
      },
    });
    emailed = true;
  } catch (e) {
    // Reported back so the confirmation does not promise an email that never
    // left. The subscription itself still stands.
    console.error("[subscribe] welcome email not sent", e);
  }

  return { ok: true, status: "subscribed", emailed };
}
