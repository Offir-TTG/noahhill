"use server";

import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site-url";
import { redirect } from "next/navigation";

type Result = { error: string } | undefined;

export async function signIn(formData: FormData): Promise<Result> {
  const email    = String(formData.get("email")    ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next     = String(formData.get("next")     ?? "/admin");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect(next || "/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/**
 * Email a password-reset link. The response is deliberately identical whether
 * or not the address exists, so this cannot be used to discover which emails
 * have accounts.
 */
export async function requestPasswordReset(formData: FormData): Promise<Result> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "enter your email address." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/admin/reset-password`,
  });

  return undefined;
}
