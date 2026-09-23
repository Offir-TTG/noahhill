"use server";

import { createClient } from "@/lib/supabase/server";

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

const MIN_LENGTH = 8;

/**
 * Change the signed-in admin's password.
 *
 * Supabase's updateUser() does not require the current password, which means a
 * borrowed open session could silently change it. We re-verify the current
 * password first so that knowing the session is not enough on its own.
 */
export async function changePassword(formData: FormData): Promise<ChangePasswordResult> {
  const current = String(formData.get("current") ?? "");
  const next    = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current) return { ok: false, error: "enter your current password." };
  if (next.length < MIN_LENGTH) {
    return { ok: false, error: `new password must be at least ${MIN_LENGTH} characters.` };
  }
  if (next !== confirm) return { ok: false, error: "the two new passwords do not match." };
  if (next === current) return { ok: false, error: "the new password is the same as the current one." };

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "you are not signed in." };

  // Re-authenticate. A wrong current password fails here, before any change.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (reauthError) return { ok: false, error: "current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
