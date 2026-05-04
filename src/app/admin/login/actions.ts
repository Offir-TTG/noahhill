"use server";

import { createClient } from "@/lib/supabase/server";
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

export async function signUp(formData: FormData): Promise<Result> {
  const email    = String(formData.get("email")    ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // If email confirmation is enabled, the user must verify before signing in.
  return { error: "Account created. Check your email to confirm, then sign in." };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
