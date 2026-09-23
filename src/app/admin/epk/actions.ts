"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { EpkContent } from "@/lib/epk-content";

/**
 * Save the press-kit blob into site_content.data.epk.
 *
 * It shares the one site_content row with the homepage content on purpose:
 * the kit and the site are two views of the same record, which is what stops
 * them drifting apart.
 */
export async function saveEpkContent(epk: EpkContent): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") {
    return { ok: false, error: "not authorised." };
  }

  const { data: row } = await supabase
    .from("site_content")
    .select("data")
    .eq("id", 1)
    .maybeSingle();

  const current = (row?.data ?? {}) as Record<string, unknown>;
  const { error } = await supabase
    .from("site_content")
    .upsert({ id: 1, data: { ...current, epk } }, { onConflict: "id" });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/epk");
  revalidatePath("/admin/epk");
  return { ok: true };
}
