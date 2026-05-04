"use server";

import { createClient } from "@/lib/supabase/server";
import { removeStorageFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import type { SiteContent } from "@/lib/site-content";

/**
 * Persist the site content blob and clean up any image URLs that were replaced.
 * Image uploads happen on the client (direct to Supabase Storage); by the time
 * this is called the URLs in `content` already point to the new files.
 */
export async function saveSiteContent(content: SiteContent): Promise<SiteContent> {
  const supabase = await createClient();

  // Capture previous URLs so we can drop the orphans after a successful save.
  const { data: previousRow } = await supabase
    .from("site_content")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  const previous = (previousRow?.data ?? {}) as Partial<SiteContent>;
  const previousHero    = previous.hero?.photo_url     ?? null;
  const previousSingle  = previous.single?.cover_url   ?? null;
  const previousAbout   = previous.about?.portrait_url ?? null;

  const { error } = await supabase
    .from("site_content")
    .upsert({ id: 1, data: content }, { onConflict: "id" });

  if (error) throw new Error(error.message);

  if (previousHero   && previousHero   !== content.hero.photo_url)     await removeStorageFile(previousHero);
  if (previousSingle && previousSingle !== content.single.cover_url)   await removeStorageFile(previousSingle);
  if (previousAbout  && previousAbout  !== content.about.portrait_url) await removeStorageFile(previousAbout);

  revalidatePath("/");
  revalidatePath("/admin/sections");

  return content;
}
